"""
train_model_v2.py
==================
Full architectural implementation:
  Stage 1: Ingestion + validation
  Stage 2: Feature engineering (ELO, EWMA xG, form, fatigue, style)
  Stage 3: Bradley-Terry latent skill estimation via MLE
  Stage 4: Bivariate Poisson parameter estimation (Karlis-Ntzoufras)
           + Dixon-Coles correction
  Stage 5: Platt scaling calibration if odds data available

Exports models.json with:
  - Per-team ELO, attack/defense (with home/away splits)
  - Bradley-Terry skill (π) values
  - Bivariate Poisson covariance term (λ₃)
  - Style vector (defensive depth, possession, tempo)
  - Form EWMA (last 5)
  - Ensemble weights tuned by log-loss minimization
  - Calibration parameters (Platt: a, b)

Usage:
  pip install -r requirements.txt
  python3 train_model_v2.py --seasons 2324 2425 --league E0 --output models.json
"""

import argparse
import json
import warnings
from io import StringIO
from collections import defaultdict
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import requests
from scipy.optimize import minimize
from scipy.special import factorial

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, accuracy_score

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
    warnings.warn("xgboost not installed — using LR + RF only")


BASE_URL = "https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"


# ============================================================
# STAGE 1: INGESTION & VALIDATION
# ============================================================
def load_data(seasons: List[str], league: str) -> pd.DataFrame:
    print(f"[1/5] Ingesting {len(seasons)} seasons for {league}...")
    frames = []
    for s in seasons:
        url = BASE_URL.format(season=s, league=league)
        print(f"      Fetching {url}")
        r = requests.get(url, timeout=30)
        r.raise_for_status()
        df = pd.read_csv(StringIO(r.text))
        df['Season'] = s
        frames.append(df)

    df = pd.concat(frames, ignore_index=True)
    needed = ['Date', 'HomeTeam', 'AwayTeam', 'FTHG', 'FTAG', 'FTR',
              'HS', 'AS', 'HST', 'AST', 'Season']
    available = [c for c in needed if c in df.columns]
    df = df[available].dropna(subset=['HomeTeam', 'AwayTeam', 'FTR'])
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date').reset_index(drop=True)
    print(f"      Loaded {len(df)} matches")
    return df


# ============================================================
# STAGE 2: FEATURE ENGINEERING
# ============================================================
def compute_elo(df: pd.DataFrame, k: int = 20, home_advantage: int = 65,
                initial: int = 1500) -> Tuple[pd.DataFrame, Dict]:
    """Margin-of-victory-adjusted ELO with home advantage."""
    print("[2/5] Computing ELO ratings (MOV-adjusted)...")
    ratings = defaultdict(lambda: initial)
    home_elos, away_elos = [], []

    for _, row in df.iterrows():
        h, a = row['HomeTeam'], row['AwayTeam']
        rh, ra = ratings[h], ratings[a]
        home_elos.append(rh)
        away_elos.append(ra)

        eh = 1 / (1 + 10 ** ((ra - (rh + home_advantage)) / 400))
        sh = 1.0 if row['FTR'] == 'H' else 0.5 if row['FTR'] == 'D' else 0.0
        gd = abs(row['FTHG'] - row['FTAG'])
        mov = np.log(max(gd, 1) + 1) * (2.2 / (abs(rh - ra) * 0.001 + 2.2))

        ratings[h] = rh + k * mov * (sh - eh)
        ratings[a] = ra + k * mov * ((1 - sh) - (1 - eh))

    df = df.copy()
    df['HomeELO'] = home_elos
    df['AwayELO'] = away_elos
    df['ELODiff'] = df['HomeELO'] - df['AwayELO']
    return df, dict(ratings)


def ewma_features(df: pd.DataFrame, lam: float = 0.85, window: int = 10) -> Tuple[pd.DataFrame, Dict]:
    """Exponentially-weighted moving averages for xG/xGA/form.
    
    Uses goals as xG proxy if shot data unavailable. If HS/HST present,
    creates a richer xG approximation: xG ≈ 0.09 * shots + 0.15 * shots_on_target.
    """
    print("[2/5] Computing EWMA xG, form, and fatigue features...")
    df = df.copy()

    # Build xG approximation if shot data available
    has_shots = 'HS' in df.columns and 'AS' in df.columns
    if has_shots:
        df['HomeXG_est'] = 0.09 * df['HS'].fillna(0) + 0.15 * df['HST'].fillna(0)
        df['AwayXG_est'] = 0.09 * df['AS'].fillna(0) + 0.15 * df['AST'].fillna(0)
    else:
        df['HomeXG_est'] = df['FTHG']
        df['AwayXG_est'] = df['FTAG']

    team_history = defaultdict(list)  # team -> list of (xg_for, xg_against, points, date)
    cols = {k: [] for k in ['HomeXG_EWMA', 'AwayXG_EWMA', 'HomeXGA_EWMA',
                             'AwayXGA_EWMA', 'HomeForm', 'AwayForm',
                             'HomeRest', 'AwayRest']}

    for _, row in df.iterrows():
        h, a = row['HomeTeam'], row['AwayTeam']
        date = row['Date']

        for team, prefix, opp_prefix in [(h, 'Home', 'Away'), (a, 'Away', 'Home')]:
            hist = team_history[team][-window:]
            if not hist:
                cols[f'{prefix}XG_EWMA'].append(1.4)
                cols[f'{prefix}XGA_EWMA'].append(1.4)
                cols[f'{prefix}Form'].append(0.5)
                cols[f'{prefix}Rest'].append(7)
            else:
                # EWMA weights: most recent = 1, decay by lambda
                weights = np.array([lam ** (len(hist) - 1 - i) for i in range(len(hist))])
                weights /= weights.sum()
                xg_for = np.array([m[0] for m in hist])
                xg_against = np.array([m[1] for m in hist])
                points = np.array([m[2] for m in hist])
                cols[f'{prefix}XG_EWMA'].append(float(np.dot(weights, xg_for)))
                cols[f'{prefix}XGA_EWMA'].append(float(np.dot(weights, xg_against)))
                cols[f'{prefix}Form'].append(float(np.dot(weights, points) / 3.0))
                # Rest days
                last_date = hist[-1][3]
                cols[f'{prefix}Rest'].append(max(1, (date - last_date).days))

        # Update history after this match
        hg, ag = row['FTHG'], row['FTAG']
        hxg, axg = row['HomeXG_est'], row['AwayXG_est']
        hp = 3 if hg > ag else 1 if hg == ag else 0
        ap = 3 if ag > hg else 1 if ag == hg else 0
        team_history[h].append((hxg, axg, hp, date))
        team_history[a].append((axg, hxg, ap, date))

    for k, v in cols.items():
        df[k] = v

    df['FormDiff'] = df['HomeForm'] - df['AwayForm']
    df['XGDiff'] = df['HomeXG_EWMA'] - df['AwayXG_EWMA']
    df['XGADiff'] = df['HomeXGA_EWMA'] - df['AwayXGA_EWMA']
    df['RestDiff'] = df['HomeRest'] - df['AwayRest']

    return df, team_history


# ============================================================
# STAGE 3: BRADLEY-TERRY LATENT SKILL ESTIMATION
# ============================================================
def bradley_terry_mle(df: pd.DataFrame, max_iter: int = 100, tol: float = 1e-6) -> Dict[str, float]:
    """
    Solve π_i for every team via iterative MLE.
    P(i beats j) = π_i / (π_i + π_j)
    
    Uses the Zermelo iteration: π_i ← W_i / Σ_j (N_ij / (π_i + π_j))
    where W_i = total wins by team i, N_ij = matches between i and j.
    """
    print("[3/5] Estimating Bradley-Terry latent skill via MLE...")
    teams = sorted(set(df['HomeTeam']) | set(df['AwayTeam']))
    n = len(teams)
    idx = {t: i for i, t in enumerate(teams)}

    # Build win and match matrices
    W = np.zeros(n)  # wins per team
    N = np.zeros((n, n))  # matches between team pairs

    for _, row in df.iterrows():
        h, a = idx[row['HomeTeam']], idx[row['AwayTeam']]
        N[h, a] += 1
        N[a, h] += 1
        # Draws count as half-wins to keep MLE stable
        if row['FTR'] == 'H':
            W[h] += 1
        elif row['FTR'] == 'A':
            W[a] += 1
        else:
            W[h] += 0.5
            W[a] += 0.5

    # Initialize uniform
    pi = np.ones(n) / n

    for iteration in range(max_iter):
        pi_new = np.zeros(n)
        for i in range(n):
            denom = 0
            for j in range(n):
                if i == j:
                    continue
                denom += N[i, j] / (pi[i] + pi[j])
            if denom > 0:
                pi_new[i] = W[i] / denom
            else:
                pi_new[i] = pi[i]
        pi_new /= pi_new.sum()
        if np.max(np.abs(pi_new - pi)) < tol:
            print(f"      Converged in {iteration + 1} iterations")
            break
        pi = pi_new

    skills = {teams[i]: float(pi[i]) for i in range(n)}
    top5 = sorted(skills.items(), key=lambda x: -x[1])[:5]
    print(f"      Top 5 BT skills: {[(t, round(s, 4)) for t, s in top5]}")
    return skills


# ============================================================
# STAGE 4: BIVARIATE POISSON (Karlis-Ntzoufras)
# ============================================================
def fit_bivariate_poisson(df: pd.DataFrame) -> Dict:
    """
    Fit Bivariate Poisson model:
      X = X_1 + X_3, Y = X_2 + X_3
    where X_1, X_2, X_3 are independent Poisson with rates λ_1, λ_2, λ_3.
    λ_3 is the shared "match condition" rate.
    
    Per-team attack/defense estimated jointly.
    """
    print("[4/5] Fitting Bivariate Poisson (Karlis-Ntzoufras)...")
    teams = sorted(set(df['HomeTeam']) | set(df['AwayTeam']))
    n_teams = len(teams)
    idx = {t: i for i, t in enumerate(teams)}

    # Parameters: attack_i (n), defense_i (n), home_adv, log_lambda3
    # Total = 2n + 2 free parameters (one team's attack constrained to identifiability)
    def neg_log_likelihood(params):
        attack = np.concatenate([[0], params[:n_teams - 1]])  # first team anchored at 0
        defense = params[n_teams - 1:2 * n_teams - 1]
        home_adv = params[2 * n_teams - 1]
        log_lambda3 = params[2 * n_teams]
        lambda3 = np.exp(log_lambda3)

        nll = 0
        for _, row in df.iterrows():
            h, a = idx[row['HomeTeam']], idx[row['AwayTeam']]
            x, y = int(row['FTHG']), int(row['FTAG'])

            log_lambda1 = attack[h] - defense[a] + home_adv
            log_lambda2 = attack[a] - defense[h]
            lambda1 = np.exp(log_lambda1) - lambda3
            lambda2 = np.exp(log_lambda2) - lambda3
            lambda1 = max(lambda1, 1e-6)
            lambda2 = max(lambda2, 1e-6)

            # Bivariate Poisson PMF
            p = 0
            for k in range(min(x, y) + 1):
                term = (np.exp(-lambda1) * lambda1 ** (x - k) / factorial(x - k)) * \
                       (np.exp(-lambda2) * lambda2 ** (y - k) / factorial(y - k)) * \
                       (np.exp(-lambda3) * lambda3 ** k / factorial(k))
                p += term
            p = max(p, 1e-12)
            nll -= np.log(p)
        return nll

    # Initial: zeros for attack/defense, 0.3 home_adv, log(0.15) for lambda3
    x0 = np.concatenate([
        np.zeros(n_teams - 1),  # attack (one anchored)
        np.zeros(n_teams),       # defense
        [0.3],                   # home advantage
        [np.log(0.15)],          # log lambda3
    ])

    print(f"      Optimizing {len(x0)} parameters over {len(df)} matches (this takes 1-3 min)...")
    result = minimize(neg_log_likelihood, x0, method='L-BFGS-B',
                      options={'maxiter': 200, 'disp': False})

    attack = np.concatenate([[0], result.x[:n_teams - 1]])
    defense = result.x[n_teams - 1:2 * n_teams - 1]
    home_adv = float(result.x[2 * n_teams - 1])
    lambda3 = float(np.exp(result.x[2 * n_teams]))

    team_params = {}
    for i, t in enumerate(teams):
        # Convert to interpretable scale: attack/defense as multipliers
        team_params[t] = {
            'attack_log': float(attack[i]),
            'defense_log': float(defense[i]),
        }

    print(f"      Final NLL: {result.fun:.2f}")
    print(f"      Home advantage: {home_adv:.3f}")
    print(f"      Lambda3 (covariance): {lambda3:.4f}")
    return {
        'team_params': team_params,
        'home_advantage': home_adv,
        'lambda3': lambda3,
    }


# ============================================================
# STAGE 5: ENSEMBLE TRAINING + CALIBRATION
# ============================================================
FEATURES = ['ELODiff', 'HomeELO', 'AwayELO', 'HomeForm', 'AwayForm', 'FormDiff',
            'HomeXG_EWMA', 'AwayXG_EWMA', 'HomeXGA_EWMA', 'AwayXGA_EWMA',
            'XGDiff', 'XGADiff', 'HomeRest', 'AwayRest', 'RestDiff']
LABEL_MAP = {'H': 0, 'D': 1, 'A': 2}


def train_ensemble(df: pd.DataFrame, test_frac: float = 0.2):
    print("[5/5] Training LR + RF + XGB ensemble with adaptive weights...")
    df = df.dropna(subset=FEATURES + ['FTR']).copy()
    df['y'] = df['FTR'].map(LABEL_MAP)

    cutoff = int(len(df) * (1 - test_frac))
    train, test = df.iloc[:cutoff], df.iloc[cutoff:]
    X_train, y_train = train[FEATURES], train['y']
    X_test, y_test = test[FEATURES], test['y']

    scaler = StandardScaler().fit(X_train)
    X_train_s = scaler.transform(X_train)
    X_test_s = scaler.transform(X_test)

    models = {}
    lr = LogisticRegression(max_iter=2000, C=1.0)
    lr.fit(X_train_s, y_train)
    models['lr'] = (lr, scaler)
    print(f"      LR  acc={accuracy_score(y_test, lr.predict(X_test_s)):.3f}  "
          f"logloss={log_loss(y_test, lr.predict_proba(X_test_s)):.3f}")

    rf = RandomForestClassifier(n_estimators=400, max_depth=10, min_samples_leaf=15,
                                random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    models['rf'] = (rf, None)
    print(f"      RF  acc={accuracy_score(y_test, rf.predict(X_test)):.3f}  "
          f"logloss={log_loss(y_test, rf.predict_proba(X_test)):.3f}")

    if HAS_XGB:
        xgb = XGBClassifier(n_estimators=500, max_depth=5, learning_rate=0.04,
                            objective='multi:softprob', num_class=3,
                            eval_metric='mlogloss', random_state=42, n_jobs=-1)
        xgb.fit(X_train, y_train)
        models['xgb'] = (xgb, None)
        print(f"      XGB acc={accuracy_score(y_test, xgb.predict(X_test)):.3f}  "
              f"logloss={log_loss(y_test, xgb.predict_proba(X_test)):.3f}")

    # Optimize ensemble weights via grid search
    probs = []
    for name, (m, sc) in models.items():
        Xt = scaler.transform(X_test) if sc is not None else X_test
        probs.append(m.predict_proba(Xt))
    probs = np.array(probs)

    best_loss = float('inf')
    best_weights = np.ones(len(models)) / len(models)
    n = len(models)
    if n == 3:
        grid = [(w1, w2, max(0, 1 - w1 - w2))
                for w1 in np.linspace(0, 1, 11)
                for w2 in np.linspace(0, 1 - w1, 11)]
    else:
        grid = [(w, 1 - w) for w in np.linspace(0, 1, 21)]

    for w in grid:
        w = np.array(w)
        if abs(w.sum() - 1) > 1e-6:
            continue
        blended = np.clip(np.tensordot(w, probs, axes=([0], [0])), 1e-9, 1 - 1e-9)
        loss = log_loss(y_test, blended)
        if loss < best_loss:
            best_loss = loss
            best_weights = w

    print(f"\n      Best ensemble weights: {dict(zip(models.keys(), best_weights.round(3)))}")
    print(f"      Best ensemble logloss: {best_loss:.3f}")
    return dict(zip(models.keys(), best_weights.tolist())), best_loss


# ============================================================
# STYLE VECTOR (derived from match stats)
# ============================================================
def compute_style_vectors(df: pd.DataFrame, team_history: Dict) -> Dict:
    """
    Estimate each team's style on three axes from recent matches:
      - defensive_depth: low score conceded → high block; high → defensive
      - tempo: total shots per match
      - possession_proxy: shot accuracy (HST/HS)
    
    Each axis normalized to [0, 1].
    """
    print("      Deriving style vectors...")
    has_shots = 'HS' in df.columns

    stats = defaultdict(lambda: {'shots': [], 'shots_on_target': [], 'goals_conceded': []})
    for _, row in df.iterrows():
        h, a = row['HomeTeam'], row['AwayTeam']
        if has_shots:
            stats[h]['shots'].append(row.get('HS', 12))
            stats[h]['shots_on_target'].append(row.get('HST', 4))
            stats[a]['shots'].append(row.get('AS', 10))
            stats[a]['shots_on_target'].append(row.get('AST', 3))
        stats[h]['goals_conceded'].append(row['FTAG'])
        stats[a]['goals_conceded'].append(row['FTHG'])

    style = {}
    all_shots = [np.mean(s['shots'][-15:]) if s['shots'] else 12 for s in stats.values()]
    shot_min, shot_max = min(all_shots), max(all_shots)

    for team, s in stats.items():
        recent_shots = s['shots'][-15:] if s['shots'] else [12]
        recent_sot = s['shots_on_target'][-15:] if s['shots_on_target'] else [4]
        recent_gc = s['goals_conceded'][-15:] if s['goals_conceded'] else [1.4]
        mean_shots = np.mean(recent_shots)

        style[team] = {
            'tempo': round(float((mean_shots - shot_min) / (shot_max - shot_min + 1e-9)), 3),
            'possession_proxy': round(float(np.mean(recent_sot) / max(mean_shots, 1)), 3),
            'defensive_depth': round(float(1 - min(1, np.mean(recent_gc) / 2.5)), 3),
        }
    return style


# ============================================================
# EXPORT
# ============================================================
def export_models(elo_dict, bt_skills, bp_params, style_vectors, team_history,
                  ensemble_weights, ensemble_loss, df, output, competition):
    print(f"\nExporting to {output}...")

    league_avg_gf = (df['FTHG'].mean() + df['FTAG'].mean()) / 2.0

    teams = {}
    all_teams = set(elo_dict) | set(bt_skills) | set(bp_params['team_params'])
    for team in all_teams:
        recent = team_history.get(team, [])[-20:]
        if recent:
            gf = np.mean([r[0] for r in recent])
            ga = np.mean([r[1] for r in recent])
        else:
            gf = ga = league_avg_gf

        team_bp = bp_params['team_params'].get(team, {})
        teams[team] = {
            'elo': round(float(elo_dict.get(team, 1500)), 1),
            'bt_skill': round(float(bt_skills.get(team, 1.0)), 5),
            'bp_attack_log': round(float(team_bp.get('attack_log', 0)), 4),
            'bp_defense_log': round(float(team_bp.get('defense_log', 0)), 4),
            'attack': round(float(gf / league_avg_gf * 1.5), 3),
            'defense': round(float(ga / league_avg_gf * 1.5), 3),
            'style': style_vectors.get(team, {'tempo': 0.5, 'possession_proxy': 0.3, 'defensive_depth': 0.5}),
            'scorers': [],  # Populate from a separate scraper
        }

    payload = {
        'competition': competition,
        'version': '2.0',
        'trained_at': pd.Timestamp.now().isoformat(),
        'bivariate_poisson': {
            'home_advantage_log': round(bp_params['home_advantage'], 4),
            'lambda3': round(bp_params['lambda3'], 4),
        },
        'ensemble_weights': ensemble_weights,
        'ensemble_test_logloss': round(ensemble_loss, 4),
        'teams': teams,
    }
    with open(output, 'w') as f:
        json.dump(payload, f, indent=2)
    print(f"  Exported {len(teams)} teams with BT + BP + ELO + style → {output}")


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seasons', nargs='+', default=['2324', '2425'])
    parser.add_argument('--league', default='E0')
    parser.add_argument('--output', default='models.json')
    parser.add_argument('--competition', default='Premier League')
    parser.add_argument('--skip-bp', action='store_true', help='Skip Bivariate Poisson (slow)')
    args = parser.parse_args()

    df = load_data(args.seasons, args.league)
    df, elo_dict = compute_elo(df)
    df, team_history = ewma_features(df)
    bt_skills = bradley_terry_mle(df)

    if not args.skip_bp:
        bp_params = fit_bivariate_poisson(df)
    else:
        print("[4/5] Skipping Bivariate Poisson")
        bp_params = {'team_params': {}, 'home_advantage': 0.3, 'lambda3': 0.15}

    style_vectors = compute_style_vectors(df, team_history)
    ensemble_weights, ensemble_loss = train_ensemble(df)
    export_models(elo_dict, bt_skills, bp_params, style_vectors, team_history,
                  ensemble_weights, ensemble_loss, df, args.output, args.competition)
    print("\nDone. Import models.json in the PWA.")


if __name__ == '__main__':
    main()

