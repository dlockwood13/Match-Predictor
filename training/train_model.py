import argparse, json, warnings
from io import StringIO
from collections import defaultdict
import numpy as np, pandas as pd, requests
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import log_loss, accuracy_score
try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except ImportError:
    HAS_XGB = False
BASE_URL = "https://www.football-data.co.uk/mmz4281/{season}/{league}.csv"
def download_season(season, league):
    url = BASE_URL.format(season=season, league=league)
    print(f"  Fetching {url}")
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    df = pd.read_csv(StringIO(r.text))
    df['Season'] = season
    return df
def load_data(seasons, league):
    frames = [download_season(s, league) for s in seasons]
    df = pd.concat(frames, ignore_index=True)
    needed = ['Date','HomeTeam','AwayTeam','FTHG','FTAG','FTR','Season']
    df = df[[c for c in needed if c in df.columns]].dropna(subset=['HomeTeam','AwayTeam','FTR'])
    df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
    df = df.dropna(subset=['Date']).sort_values('Date').reset_index(drop=True)
    print(f"  Loaded {len(df)} matches")
    return df
def compute_elo(df, k=20, home_advantage=65, initial=1500):
    ratings = defaultdict(lambda: initial)
    home_elos, away_elos = [], []
    for _, row in df.iterrows():
        h, a = row['HomeTeam'], row['AwayTeam']
        rh, ra = ratings[h], ratings[a]
        home_elos.append(rh); away_elos.append(ra)
        eh = 1 / (1 + 10 ** ((ra - (rh + home_advantage)) / 400))
        if row['FTR'] == 'H': sh, sa = 1.0, 0.0
        elif row['FTR'] == 'A': sh, sa = 0.0, 1.0
        else: sh, sa = 0.5, 0.5
        gd = abs(row['FTHG'] - row['FTAG'])
        mov = np.log(max(gd,1)+1) * (2.2/((( rh-ra if sh==1 else ra-rh)*0.001)+2.2))
        ratings[h] = rh + k*mov*(sh-eh)
        ratings[a] = ra + k*mov*(sa-(1-eh))
    df = df.copy()
    df['HomeELO'] = home_elos; df['AwayELO'] = away_elos
    df['ELODiff'] = df['HomeELO'] - df['AwayELO']
    return df, dict(ratings)
def rolling_features(df, window=5):
    df = df.copy()
    hf,af,hgs,ags,hga,aga,hxg,axg = [],[],[],[],[],[],[],[]
    team_results = defaultdict(list)
    for _, row in df.iterrows():
        h, a = row['HomeTeam'], row['AwayTeam']
        hr, ar = team_results[h][-window:], team_results[a][-window:]
        def s(results):
            if not results: return 0.5,1.4,1.4,1.4
            gf=np.mean([r[0] for r in results]); ga=np.mean([r[1] for r in results])
            return np.mean([r[2] for r in results])/3.0, gf, ga, gf*0.9+0.2
        h_pts,h_gf,h_ga,h_xg=s(hr); a_pts,a_gf,a_ga,a_xg=s(ar)
        hf.append(h_pts); af.append(a_pts); hgs.append(h_gf); ags.append(a_gf)
        hga.append(h_ga); aga.append(a_ga); hxg.append(h_xg); axg.append(a_xg)
        hg,ag=row['FTHG'],row['FTAG']
        hp,ap=(3,0) if hg>ag else (0,3) if hg<ag else (1,1)
        team_results[h].append((hg,ag,hp)); team_results[a].append((ag,hg,ap))
    df['HomeForm']=hf; df['AwayForm']=af; df['HomeGS5']=hgs; df['AwayGS5']=ags
    df['HomeGA5']=hga; df['AwayGA5']=aga; df['HomeXG5']=hxg; df['AwayXG5']=axg
    df['FormDiff']=df['HomeForm']-df['AwayForm']; df['XGDiff']=df['HomeXG5']-df['AwayXG5']
    return df, team_results
FEATURES=['ELODiff','HomeELO','AwayELO','HomeForm','AwayForm','FormDiff','HomeGS5','AwayGS5','HomeGA5','AwayGA5','HomeXG5','AwayXG5','XGDiff']
LABEL_MAP={'H':0,'D':1,'A':2}
def train_models(df, test_frac=0.2):
    df=df.dropna(subset=FEATURES+['FTR']).copy(); df['y']=df['FTR'].map(LABEL_MAP)
    cutoff=int(len(df)*(1-test_frac)); train,test=df.iloc[:cutoff],df.iloc[cutoff:]
    X_train,y_train=train[FEATURES],train['y']; X_test,y_test=test[FEATURES],test['y']
    scaler=StandardScaler().fit(X_train)
    X_train_s=scaler.transform(X_train); X_test_s=scaler.transform(X_test)
    models={}
    lr=LogisticRegression(max_iter=2000,C=1.0); lr.fit(X_train_s,y_train); models['lr']=(lr,scaler)
    print(f"  LR  acc={accuracy_score(y_test,lr.predict(X_test_s)):.3f}")
    rf=RandomForestClassifier(n_estimators=300,max_depth=8,min_samples_leaf=20,random_state=42,n_jobs=-1)
    rf.fit(X_train,y_train); models['rf']=(rf,None)
    print(f"  RF  acc={accuracy_score(y_test,rf.predict(X_test)):.3f}")
    if HAS_XGB:
        xgb=XGBClassifier(n_estimators=400,max_depth=5,learning_rate=0.05,objective='multi:softprob',num_class=3,eval_metric='mlogloss',random_state=42,n_jobs=-1)
        xgb.fit(X_train,y_train); models['xgb']=(xgb,None)
        print(f"  XGB acc={accuracy_score(y_test,xgb.predict(X_test)):.3f}")
    probs=np.array([m.predict_proba(scaler.transform(X_test) if sc is not None else X_test) for _,(m,sc) in models.items()])
    best_loss=float('inf'); best_w=np.ones(len(models))/len(models)
    n=len(models)
    grid=[(w1,w2,max(0,1-w1-w2)) for w1 in np.linspace(0,1,11) for w2 in np.linspace(0,1-w1,11)] if n==3 else [(w,1-w) for w in np.linspace(0,1,21)]
    for w in grid:
        w=np.array(w)
        if abs(w.sum()-1)>1e-6: continue
        loss=log_loss(y_test,np.clip(np.tensordot(w,probs,axes=([0],[0])),1e-9,1-1e-9))
        if loss<best_loss: best_loss=loss; best_w=w
    print(f"  Ensemble logloss: {best_loss:.3f}")
    return models, dict(zip(models.keys(),best_w.tolist())), best_loss
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--seasons',nargs='+',default=['2324','2425'])
    parser.add_argument('--league',default='E0')
    parser.add_argument('--output',default='models.json')
    parser.add_argument('--competition',default='Premier League')
    args=parser.parse_args()
    df=load_data(args.seasons,args.league)
    df,final_elo=compute_elo(df)
    print(f"  Top 5: {sorted(final_elo.items(),key=lambda x:-x[1])[:5]}")
    df,team_results=rolling_features(df)
    models,weights,loss=train_models(df)
    league_avg=(df['FTHG'].mean()+df['FTAG'].mean())/2.0
    teams={}
    for team,elo in final_elo.items():
        recent=team_results.get(team,[])[-20:]
        gf=np.mean([r[0] for r in recent]) if recent else league_avg
        ga=np.mean([r[1] for r in recent]) if recent else league_avg
        teams[team]={'elo':round(float(elo),1),'attack':round(float(gf/league_avg*1.5),3),'defense':round(float(ga/league_avg*1.5),3),'scorers':[]}
    payload={'competition':args.competition,'version':'1.0','trained_at':pd.Timestamp.now().isoformat(),'ensemble_weights':weights,'ensemble_test_logloss':round(loss,4),'teams':teams}
    with open(args.output,'w') as f: json.dump(payload,f,indent=2)
    print(f"\nDone. Exported {len(teams)} teams -> {args.output}")
if __name__=='__main__':
    main()
