import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, Zap, Target, Activity, BarChart3, Brain, Coins, Calculator, ChevronRight, RefreshCw, Search, Trash2, Clock, User, Upload } from 'lucide-react';

// ============ TEAM DATA ============
const PREMIER_LEAGUE = {
  'Manchester City': { elo: 1920, attack: 2.4, defense: 0.9, scorers: [['Haaland', 0.42], ['Foden', 0.14], ['Doku', 0.10], ['Alvarez', 0.09]] },
  'Arsenal': { elo: 1890, attack: 2.2, defense: 0.95, scorers: [['Saka', 0.22], ['Havertz', 0.18], ['Odegaard', 0.13], ['Trossard', 0.11]] },
  'Liverpool': { elo: 1885, attack: 2.3, defense: 1.0, scorers: [['Salah', 0.32], ['Nunez', 0.16], ['Diaz', 0.12], ['Jota', 0.11]] },
  'Chelsea': { elo: 1810, attack: 2.0, defense: 1.1, scorers: [['Palmer', 0.30], ['Jackson', 0.16], ['Sterling', 0.10], ['Madueke', 0.09]] },
  'Tottenham': { elo: 1795, attack: 2.1, defense: 1.3, scorers: [['Son', 0.25], ['Solanke', 0.18], ['Maddison', 0.11], ['Johnson', 0.10]] },
  'Newcastle': { elo: 1780, attack: 1.9, defense: 1.15, scorers: [['Isak', 0.28], ['Gordon', 0.16], ['Murphy', 0.10], ['Joelinton', 0.08]] },
  'Manchester United': { elo: 1770, attack: 1.85, defense: 1.25, scorers: [['Hojlund', 0.20], ['Garnacho', 0.15], ['Fernandes', 0.14], ['Rashford', 0.13]] },
  'Aston Villa': { elo: 1760, attack: 1.95, defense: 1.2, scorers: [['Watkins', 0.30], ['Bailey', 0.13], ['Rogers', 0.11], ['McGinn', 0.09]] },
  'Brighton': { elo: 1720, attack: 1.7, defense: 1.3, scorers: [['Welbeck', 0.20], ['Joao Pedro', 0.18], ['Mitoma', 0.13], ['Minteh', 0.10]] },
  'West Ham': { elo: 1700, attack: 1.6, defense: 1.35, scorers: [['Bowen', 0.26], ['Kudus', 0.15], ['Antonio', 0.11], ['Paqueta', 0.09]] },
  'Crystal Palace': { elo: 1680, attack: 1.5, defense: 1.3, scorers: [['Mateta', 0.24], ['Eze', 0.18], ['Sarr', 0.13], ['Munoz', 0.08]] },
  'Brentford': { elo: 1670, attack: 1.55, defense: 1.4, scorers: [['Mbeumo', 0.28], ['Wissa', 0.20], ['Schade', 0.10], ['Lewis-Potter', 0.08]] },
  'Fulham': { elo: 1660, attack: 1.5, defense: 1.4, scorers: [['Muniz', 0.22], ['Wilson', 0.15], ['Iwobi', 0.12], ['Smith Rowe', 0.09]] },
  'Bournemouth': { elo: 1640, attack: 1.55, defense: 1.5, scorers: [['Evanilson', 0.20], ['Semenyo', 0.15], ['Kluivert', 0.13], ['Tavernier', 0.10]] },
  'Wolves': { elo: 1635, attack: 1.45, defense: 1.45, scorers: [['Cunha', 0.26], ['Strand Larsen', 0.17], ['Hwang', 0.10], ['Sarabia', 0.08]] },
  'Everton': { elo: 1625, attack: 1.4, defense: 1.4, scorers: [['Beto', 0.18], ['Calvert-Lewin', 0.16], ['Ndiaye', 0.12], ['Doucoure', 0.10]] },
  'Nottingham Forest': { elo: 1615, attack: 1.5, defense: 1.55, scorers: [['Wood', 0.30], ['Hudson-Odoi', 0.14], ['Gibbs-White', 0.11], ['Elanga', 0.10]] },
  'Leeds': { elo: 1600, attack: 1.45, defense: 1.5, scorers: [['Piroe', 0.22], ['Aaronson', 0.13], ['James', 0.11], ['Rothwell', 0.08]] },
  'Burnley': { elo: 1580, attack: 1.3, defense: 1.6, scorers: [['Foster', 0.16], ['Brownhill', 0.13], ['Anthony', 0.11], ['Flemming', 0.09]] },
  'Sunderland': { elo: 1570, attack: 1.35, defense: 1.65, scorers: [['Mayenda', 0.18], ['Isidor', 0.15], ['Le Fee', 0.10], ['Roberts', 0.08]] },
};

const WORLD_CUP_TEAMS = {
  'Argentina': { elo: 2140, attack: 2.3, defense: 0.85, scorers: [['Messi', 0.24], ['Lautaro Martinez', 0.20], ['Alvarez', 0.16], ['Di Maria', 0.10]] },
  'France': { elo: 2105, attack: 2.4, defense: 0.95, scorers: [['Mbappe', 0.32], ['Dembele', 0.13], ['Olise', 0.12], ['Thuram', 0.10]] },
  'Spain': { elo: 2095, attack: 2.2, defense: 0.9, scorers: [['Yamal', 0.20], ['Oyarzabal', 0.18], ['Morata', 0.14], ['Williams', 0.12]] },
  'England': { elo: 2050, attack: 2.1, defense: 1.0, scorers: [['Kane', 0.30], ['Bellingham', 0.16], ['Saka', 0.13], ['Foden', 0.10]] },
  'Brazil': { elo: 2045, attack: 2.25, defense: 1.05, scorers: [['Vinicius Jr', 0.22], ['Rodrygo', 0.15], ['Raphinha', 0.14], ['Endrick', 0.10]] },
  'Portugal': { elo: 2025, attack: 2.15, defense: 1.05, scorers: [['Ronaldo', 0.24], ['B. Fernandes', 0.16], ['Leao', 0.14], ['B. Silva', 0.10]] },
  'Netherlands': { elo: 2010, attack: 2.0, defense: 1.0, scorers: [['Gakpo', 0.20], ['Depay', 0.18], ['Reijnders', 0.12], ['Simons', 0.10]] },
  'Germany': { elo: 1995, attack: 2.05, defense: 1.1, scorers: [['Wirtz', 0.18], ['Musiala', 0.17], ['Havertz', 0.14], ['Kleindienst', 0.10]] },
  'Belgium': { elo: 1965, attack: 1.95, defense: 1.1, scorers: [['Lukaku', 0.26], ['De Bruyne', 0.14], ['Trossard', 0.11], ['Doku', 0.10]] },
  'Italy': { elo: 1955, attack: 1.85, defense: 1.0, scorers: [['Retegui', 0.24], ['Kean', 0.15], ['Raspadori', 0.10], ['Frattesi', 0.09]] },
  'Croatia': { elo: 1935, attack: 1.8, defense: 1.1, scorers: [['Kramaric', 0.22], ['Budimir', 0.15], ['Perisic', 0.12], ['Modric', 0.09]] },
  'Morocco': { elo: 1910, attack: 1.65, defense: 0.95, scorers: [['En-Nesyri', 0.24], ['Ziyech', 0.14], ['Diaz', 0.12], ['Ounahi', 0.08]] },
  'Uruguay': { elo: 1900, attack: 1.85, defense: 1.15, scorers: [['Nunez', 0.22], ['Pellistri', 0.13], ['De Arrascaeta', 0.12], ['Araujo', 0.08]] },
  'Colombia': { elo: 1885, attack: 1.85, defense: 1.15, scorers: [['L. Diaz', 0.22], ['J. Cordoba', 0.15], ['Borre', 0.12], ['James', 0.10]] },
  'Switzerland': { elo: 1860, attack: 1.7, defense: 1.1, scorers: [['Embolo', 0.20], ['Vargas', 0.16], ['Ndoye', 0.12], ['Amdouni', 0.10]] },
  'USA': { elo: 1840, attack: 1.7, defense: 1.2, scorers: [['Pulisic', 0.24], ['Balogun', 0.16], ['Reyna', 0.11], ['Weah', 0.10]] },
  'Mexico': { elo: 1830, attack: 1.7, defense: 1.25, scorers: [['Jimenez', 0.22], ['H. Lozano', 0.16], ['Gimenez', 0.14], ['Antuna', 0.09]] },
  'Japan': { elo: 1820, attack: 1.65, defense: 1.15, scorers: [['Ueda', 0.20], ['Kamada', 0.13], ['Mitoma', 0.12], ['Doan', 0.11]] },
  'Senegal': { elo: 1815, attack: 1.7, defense: 1.2, scorers: [['Sarr', 0.22], ['Jackson', 0.16], ['Diatta', 0.10], ['Dia', 0.10]] },
  'Denmark': { elo: 1810, attack: 1.7, defense: 1.15, scorers: [['Hojlund', 0.20], ['Eriksen', 0.15], ['Damsgaard', 0.12], ['Dolberg', 0.10]] },
  'Poland': { elo: 1790, attack: 1.65, defense: 1.2, scorers: [['Lewandowski', 0.32], ['Zalewski', 0.10], ['Piatek', 0.10], ['Buksa', 0.08]] },
  'South Korea': { elo: 1785, attack: 1.65, defense: 1.25, scorers: [['Son', 0.26], ['Hwang', 0.15], ['Lee Kang-in', 0.13], ['Cho Gue-sung', 0.10]] },
  'Ecuador': { elo: 1770, attack: 1.55, defense: 1.2, scorers: [['E. Valencia', 0.26], ['Sarmiento', 0.13], ['Plata', 0.10], ['Mena', 0.08]] },
  'Australia': { elo: 1755, attack: 1.5, defense: 1.25, scorers: [['Duke', 0.18], ['Boyle', 0.13], ['Kuol', 0.11], ['Goodwin', 0.09]] },
  'Canada': { elo: 1745, attack: 1.55, defense: 1.3, scorers: [['David', 0.26], ['Larin', 0.15], ['Davies', 0.10], ['Buchanan', 0.09]] },
  'Saudi Arabia': { elo: 1720, attack: 1.4, defense: 1.35, scorers: [['Al-Shehri', 0.18], ['Al-Buraikan', 0.14], ['Al-Dawsari', 0.13], ['Al-Shamrani', 0.09]] },
  'Tunisia': { elo: 1710, attack: 1.4, defense: 1.3, scorers: [['Jebali', 0.18], ['Khazri', 0.13], ['Msakni', 0.11], ['Sliti', 0.08]] },
  'Iran': { elo: 1705, attack: 1.45, defense: 1.35, scorers: [['Taremi', 0.28], ['Azmoun', 0.18], ['Jahanbakhsh', 0.10], ['Ghoddos', 0.08]] },
  'Ghana': { elo: 1695, attack: 1.5, defense: 1.4, scorers: [['I. Williams', 0.20], ['J. Ayew', 0.14], ['A. Ayew', 0.12], ['Kudus', 0.11]] },
  'Costa Rica': { elo: 1685, attack: 1.4, defense: 1.35, scorers: [['Campbell', 0.20], ['Contreras', 0.12], ['Borges', 0.10], ['Tejeda', 0.08]] },
};

// ============ ML MODEL ============
function predictMatch(home, away, homeData, awayData) {
  const homeAdvantage = 65;
  const eloDiff = (homeData.elo + homeAdvantage) - awayData.elo;
  const eloHomeWin = 1 / (1 + Math.pow(10, -eloDiff / 400));

  const homeXG = homeData.attack * awayData.defense * 1.1;
  const awayXG = awayData.attack * homeData.defense * 0.9;

  const { homeWin: poissonHome, draw: poissonDraw, awayWin: poissonAway } =
    poissonOutcomes(homeXG, awayXG);

  const w_elo = 0.45, w_poisson = 0.40, w_form = 0.15;

  let pHome = (eloHomeWin * 0.85) * w_elo + poissonHome * w_poisson + (eloHomeWin * 0.85) * w_form;
  let pAway = ((1 - eloHomeWin) * 0.85) * w_elo + poissonAway * w_poisson + ((1 - eloHomeWin) * 0.85) * w_form;
  let pDraw = 0.15 * w_elo + poissonDraw * w_poisson + 0.15 * w_form;

  const total = pHome + pDraw + pAway;
  pHome /= total; pDraw /= total; pAway /= total;

  const maxP = Math.max(pHome, pDraw, pAway);
  const confidence = Math.min(1, (maxP - 0.333) / 0.5);

  return {
    home: pHome, draw: pDraw, away: pAway,
    confidence,
    expectedGoals: { home: homeXG, away: awayXG },
  };
}

function poissonOutcomes(lambdaHome, lambdaAway, maxGoals = 6) {
  let homeWin = 0, draw = 0, awayWin = 0;
  for (let h = 0; h <= maxGoals; h++) {
    for (let a = 0; a <= maxGoals; a++) {
      const p = poissonPMF(h, lambdaHome) * poissonPMF(a, lambdaAway);
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;
    }
  }
  const total = homeWin + draw + awayWin;
  return { homeWin: homeWin / total, draw: draw / total, awayWin: awayWin / total };
}

function poissonPMF(k, lambda) {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n) {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// ============ FIRST GOAL MINUTE ============
function firstGoalDistribution(homeXG, awayXG) {
  const totalXG = homeXG + awayXG;
  const ratePerMinute = totalXG / 90;
  const buckets = [
    { label: '0-15', start: 0, end: 15 },
    { label: '16-30', start: 15, end: 30 },
    { label: '31-45', start: 30, end: 45 },
    { label: '46-60', start: 45, end: 60 },
    { label: '61-75', start: 60, end: 75 },
    { label: '76-90', start: 75, end: 90 },
  ];

  const results = buckets.map(b => {
    const p = Math.exp(-ratePerMinute * b.start) - Math.exp(-ratePerMinute * b.end);
    return { ...b, prob: p };
  });

  const noGoal = Math.exp(-ratePerMinute * 90);
  results.push({ label: 'No goal', start: 90, end: 90, prob: noGoal });

  const expectedMinute = (1 - Math.exp(-ratePerMinute * 90)) > 0
    ? (1 / ratePerMinute) * (1 - Math.exp(-ratePerMinute * 90) * (1 + ratePerMinute * 90)) / (1 - Math.exp(-ratePerMinute * 90))
    : 90;

  return { buckets: results, expectedMinute: Math.min(90, expectedMinute), noGoalProb: noGoal };
}

// ============ FIRST GOAL SCORER ============
function firstGoalScorers(homeData, awayData, mlPred) {
  const homeScoresFirst = mlPred.expectedGoals.home / (mlPred.expectedGoals.home + mlPred.expectedGoals.away);
  const awayScoresFirst = 1 - homeScoresFirst;
  const anyGoalProb = 1 - firstGoalDistribution(mlPred.expectedGoals.home, mlPred.expectedGoals.away).noGoalProb;

  const scorers = [];
  homeData.scorers.forEach(([name, share]) => {
    scorers.push({ name, team: 'home', prob: homeScoresFirst * share * anyGoalProb });
  });
  awayData.scorers.forEach(([name, share]) => {
    scorers.push({ name, team: 'away', prob: awayScoresFirst * share * anyGoalProb });
  });

  scorers.sort((a, b) => b.prob - a.prob);
  return scorers.slice(0, 8);
}

// ============ BOOKMAKER ============
function oddsToProb(homeOdds, drawOdds, awayOdds) {
  if (!homeOdds || !drawOdds || !awayOdds) return null;
  const pH = 1 / homeOdds, pD = 1 / drawOdds, pA = 1 / awayOdds;
  const overround = pH + pD + pA;
  return {
    home: pH / overround, draw: pD / overround, away: pA / overround,
    overround: (overround - 1) * 100,
  };
}

// ============ POLYMARKET ============
async function fetchPolymarketMarkets(query) {
  try {
    const url = `https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=20&order=volume24hr&ascending=false`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Polymarket API error');
    const data = await response.json();
    const q = (query || '').toLowerCase();
    return data.filter(m => {
      const text = `${m.question || ''} ${m.description || ''}`.toLowerCase();
      return text.includes('soccer') || text.includes('football') ||
             text.includes('premier') || text.includes('world cup') ||
             text.includes('fifa') || (q && text.includes(q));
    }).slice(0, 10);
  } catch (e) {
    console.error('Polymarket fetch failed:', e);
    return null;
  }
}



// ============ CLAUDE API ============
// Pick endpoint: if VITE_CLAUDE_PROXY_URL is set, use that (recommended for production).
// Otherwise call the Anthropic API directly with VITE_ANTHROPIC_API_KEY (dev only — key exposed in browser).
const CLAUDE_PROXY = import.meta.env.VITE_CLAUDE_PROXY_URL || '';
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

async function getClaudeAnalysis(context) {
  const prompt = `You are a sharp football analyst specializing in finding edges between data sources. Analyze this match.

MATCH: ${context.home} vs ${context.away}
COMPETITION: ${context.competition}

ML MODEL (ELO + xG + form ensemble):
- ${context.home} win: ${(context.ml.home * 100).toFixed(1)}%
- Draw: ${(context.ml.draw * 100).toFixed(1)}%
- ${context.away} win: ${(context.ml.away * 100).toFixed(1)}%
- Expected goals: ${context.ml.expectedGoals.home.toFixed(2)} - ${context.ml.expectedGoals.away.toFixed(2)}
- Expected first goal minute: ${context.firstGoal.expectedMinute.toFixed(1)}
- No goal probability: ${(context.firstGoal.noGoalProb * 100).toFixed(1)}%
- Top first-goal-scorer candidates: ${context.scorers.slice(0, 4).map(s => `${s.name} (${(s.prob * 100).toFixed(1)}%)`).join(', ')}

BOOKMAKER (overround removed):
${context.bookmaker ? `- ${context.home} win: ${(context.bookmaker.home * 100).toFixed(1)}%
- Draw: ${(context.bookmaker.draw * 100).toFixed(1)}%
- ${context.away} win: ${(context.bookmaker.away * 100).toFixed(1)}%
- Overround: ${context.bookmaker.overround.toFixed(2)}%` : '(not provided)'}

POLYMARKET (real-money crowd):
${context.polymarket ? `- ${context.home} win: ${(context.polymarket.home * 100).toFixed(1)}%
- Draw: ${(context.polymarket.draw * 100).toFixed(1)}%
- ${context.away} win: ${(context.polymarket.away * 100).toFixed(1)}%` : '(no liquid market found)'}

Respond in JSON only (no markdown, no code fences):
{
  "headline": "one-sentence summary (max 15 words)",
  "divergences": [{"source_a":"ML","source_b":"Polymarket","outcome":"Home/Draw/Away","gap_pct":number,"interpretation":"short"}],
  "hypotheses": ["3-5 short hypotheses"],
  "first_goal_take": "1-2 sentences on first goal timing/scorer narrative",
  "recommendation": {"verdict":"ML/Bookmaker/Polymarket/None","reasoning":"2-3 sentences","confidence":"Low/Medium/High"},
  "final_take": "2-3 sentence summary"
}`;

  try {
    let response;
    if (CLAUDE_PROXY) {
      response = await fetch(CLAUDE_PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
    } else if (ANTHROPIC_KEY) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } else {
      throw new Error('No Claude endpoint configured. Set VITE_CLAUDE_PROXY_URL or VITE_ANTHROPIC_API_KEY in .env.local');
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text).join('\n')
      .replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (e) {
    console.error('Claude analysis failed:', e);
    return { headline: 'Claude analysis unavailable', final_take: e.message };
  }
}

// ============ STORAGE WRAPPER ============
const storage = {
  get: (key) => {
    try { const v = localStorage.getItem(key); return v ? { value: v } : null; }
    catch { return null; }
  },
  set: (key, value) => {
    try { localStorage.setItem(key, value); return true; } catch { return false; }
  },
  delete: (key) => {
    try { localStorage.removeItem(key); return true; } catch { return false; }
  },
};

// ============ COMPONENTS ============
function ProbBar({ label, value, color }) {
  const pct = (value * 100).toFixed(1);
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-200 font-mono">{pct}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function SourceCard({ title, icon: Icon, probs, accentColor, subtitle }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={accentColor} />
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>
      <div className="text-xs text-zinc-500 mb-3 truncate">{subtitle || '\u00A0'}</div>
      <ProbBar label="Home" value={probs.home} color="bg-emerald-500" />
      <ProbBar label="Draw" value={probs.draw} color="bg-amber-500" />
      <ProbBar label="Away" value={probs.away} color="bg-rose-500" />
    </div>
  );
}

function FirstGoalTiming({ data }) {
  if (!data) return null;
  const maxProb = Math.max(...data.buckets.map(b => b.prob));
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Clock size={16} className="text-cyan-400" />
          First Goal Minute
        </h3>
        <div className="text-xs text-zinc-500">
          Expected: <span className="font-mono text-cyan-400">{data.expectedMinute.toFixed(0)}'</span>
        </div>
      </div>
      <div className="space-y-1.5">
        {data.buckets.map((b, i) => {
          const isNoGoal = b.label === 'No goal';
          const color = isNoGoal ? 'bg-zinc-600' : i < 3 ? 'bg-cyan-500' : 'bg-cyan-700';
          return (
            <div key={b.label} className="flex items-center gap-2 text-xs">
              <div className="w-14 text-zinc-400">{b.label}{!isNoGoal && "'"}</div>
              <div className="flex-1 h-3 bg-zinc-800 rounded overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${(b.prob / maxProb) * 100}%` }} />
              </div>
              <div className="w-12 text-right font-mono text-zinc-300">{(b.prob * 100).toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FirstScorerCard({ scorers, homeTeam, awayTeam }) {
  if (!scorers) return null;
  const maxProb = Math.max(...scorers.map(s => s.prob));
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
        <User size={16} className="text-pink-400" />
        First Goal Scorer
      </h3>
      <div className="space-y-1.5">
        {scorers.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-32 truncate">
              <span className="text-zinc-200">{s.name}</span>
              <span className={`ml-1 text-[10px] ${s.team === 'home' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {s.team === 'home' ? homeTeam.slice(0, 3).toUpperCase() : awayTeam.slice(0, 3).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
              <div className={`h-full ${s.team === 'home' ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-500`}
                   style={{ width: `${(s.prob / maxProb) * 100}%` }} />
            </div>
            <div className="w-12 text-right font-mono text-zinc-300">{(s.prob * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DivergenceHeatmap({ ml, bookmaker, polymarket }) {
  if (!ml) return null;
  const outcomes = ['home', 'draw', 'away'];
  const labels = ['Home Win', 'Draw', 'Away Win'];
  const sources = [
    { name: 'ML', data: ml },
    bookmaker && { name: 'Book', data: bookmaker },
    polymarket && { name: 'Poly', data: polymarket },
  ].filter(Boolean);
  if (sources.length < 2) return null;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-cyan-400" />
        Divergence Matrix
      </h3>
      <div className="space-y-2">
        {outcomes.map((outcome, i) => {
          const values = sources.map(s => s.data[outcome]);
          const max = Math.max(...values), min = Math.min(...values);
          const spread = ((max - min) * 100).toFixed(1);
          const spreadColor = spread > 10 ? 'text-rose-400' : spread > 5 ? 'text-amber-400' : 'text-emerald-400';
          return (
            <div key={outcome} className="flex items-center gap-3 text-xs">
              <div className="w-20 text-zinc-400">{labels[i]}</div>
              <div className="flex-1 flex gap-2">
                {sources.map((s, j) => (
                  <div key={j} className="flex-1 text-center">
                    <div className="text-zinc-500 text-[10px] mb-0.5">{s.name}</div>
                    <div className="font-mono text-zinc-200">{(s.data[outcome] * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
              <div className={`w-16 text-right font-mono ${spreadColor}`}>Δ{spread}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClaudeAnalysis({ analysis, loading }) {
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-violet-950/30 to-zinc-900/50 border border-violet-900/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-violet-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-zinc-200">Claude is analyzing…</h3>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }
  if (!analysis) return null;
  const confColor = analysis.recommendation?.confidence === 'High' ? 'text-emerald-400'
    : analysis.recommendation?.confidence === 'Medium' ? 'text-amber-400' : 'text-zinc-400';

  return (
    <div className="bg-gradient-to-br from-violet-950/30 to-zinc-900/50 border border-violet-900/50 rounded-lg p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Brain size={16} className="text-violet-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Claude's Analysis</h3>
        </div>
        <p className="text-zinc-100 font-medium leading-snug">{analysis.headline}</p>
      </div>

      {analysis.divergences?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Key Divergences</div>
          <div className="space-y-1.5">
            {analysis.divergences.map((d, i) => (
              <div key={i} className="text-xs bg-zinc-950/50 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-300">
                    <span className="text-cyan-400">{d.source_a}</span> vs <span className="text-cyan-400">{d.source_b}</span> on <span className="text-amber-300">{d.outcome}</span>
                  </span>
                  <span className="font-mono text-rose-400">Δ{d.gap_pct?.toFixed?.(1) ?? d.gap_pct}%</span>
                </div>
                <div className="text-zinc-400">{d.interpretation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.first_goal_take && (
        <div className="bg-zinc-950/50 rounded p-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <Clock size={11} /> First Goal Read
          </div>
          <p className="text-xs text-zinc-300">{analysis.first_goal_take}</p>
        </div>
      )}

      {analysis.hypotheses?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Hypotheses</div>
          <ul className="space-y-1">
            {analysis.hypotheses.map((h, i) => (
              <li key={i} className="text-xs text-zinc-300 flex gap-2">
                <span className="text-violet-400">·</span><span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.recommendation && (
        <div className="bg-zinc-950/50 rounded p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Verdict</div>
            <div className={`text-xs font-semibold ${confColor}`}>{analysis.recommendation.confidence} confidence</div>
          </div>
          <div className="text-sm text-zinc-100 font-medium mb-1">Trust: {analysis.recommendation.verdict}</div>
          <div className="text-xs text-zinc-400">{analysis.recommendation.reasoning}</div>
        </div>
      )}

      {analysis.final_take && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Final Take</div>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.final_take}</p>
        </div>
      )}
    </div>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [competition, setCompetition] = useState('Premier League');
  const [homeTeam, setHomeTeam] = useState('Manchester City');
  const [awayTeam, setAwayTeam] = useState('Arsenal');
  const [bookmakerOdds, setBookmakerOdds] = useState({ home: '', draw: '', away: '' });

  const [polymarketData, setPolymarketData] = useState(null);
  const [polymarketLoading, setPolymarketLoading] = useState(false);
  const [polymarketSearch, setPolymarketSearch] = useState('');
  const [polymarketResults, setPolymarketResults] = useState(null);

  const [claudeAnalysis, setClaudeAnalysis] = useState(null);
  const [claudeLoading, setClaudeLoading] = useState(false);

  const [history, setHistory] = useState([]);



  const [customTeams, setCustomTeams] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const baseTeams = competition === 'Premier League' ? PREMIER_LEAGUE : WORLD_CUP_TEAMS;
  const teams = customTeams && customTeams.competition === competition ? customTeams.teams : baseTeams;
  const teamList = Object.keys(teams);

  useEffect(() => {
    if (competition === 'Premier League') {
      setHomeTeam('Manchester City');
      setAwayTeam('Arsenal');
    } else {
      setHomeTeam('Argentina');
      setAwayTeam('France');
    }
    setFixtures(null);
  }, [competition]);

  useEffect(() => {
    const h = storage.get('prediction_history');
    if (h?.value) { try { setHistory(JSON.parse(h.value)); } catch {} }

  }, []);

  const mlPrediction = useMemo(() => {
    if (!homeTeam || !awayTeam || homeTeam === awayTeam || !teams[homeTeam] || !teams[awayTeam]) return null;
    return predictMatch(homeTeam, awayTeam, teams[homeTeam], teams[awayTeam]);
  }, [homeTeam, awayTeam, teams]);

  const firstGoalData = useMemo(() => {
    if (!mlPrediction) return null;
    return firstGoalDistribution(mlPrediction.expectedGoals.home, mlPrediction.expectedGoals.away);
  }, [mlPrediction]);

  const scorerData = useMemo(() => {
    if (!mlPrediction || !teams[homeTeam] || !teams[awayTeam]) return null;
    return firstGoalScorers(teams[homeTeam], teams[awayTeam], mlPrediction);
  }, [mlPrediction, homeTeam, awayTeam, teams]);

  const bookmakerProbs = useMemo(() => {
    const h = parseFloat(bookmakerOdds.home), d = parseFloat(bookmakerOdds.draw), a = parseFloat(bookmakerOdds.away);
    return oddsToProb(h, d, a);
  }, [bookmakerOdds]);

  async function searchPolymarket() {
    setPolymarketLoading(true);
    setPolymarketResults(null);
    const results = await fetchPolymarketMarkets(polymarketSearch || `${homeTeam} ${awayTeam}`);
    setPolymarketResults(results);
    setPolymarketLoading(false);
  }

  function selectPolymarketMarket(market) {
    try {
      const outcomes = market.outcomes ? JSON.parse(market.outcomes) : ['Yes', 'No'];
      const prices = market.outcomePrices ? JSON.parse(market.outcomePrices) : ['0.5', '0.5'];
      if (outcomes.length === 3) {
        const total = prices.reduce((s, p) => s + parseFloat(p), 0);
        setPolymarketData({
          home: parseFloat(prices[0]) / total,
          draw: parseFloat(prices[1]) / total,
          away: parseFloat(prices[2]) / total,
          market: market.question,
        });
      } else {
        const pHome = parseFloat(prices[0]);
        const pNotHome = 1 - pHome;
        setPolymarketData({
          home: pHome, draw: pNotHome * 0.3, away: pNotHome * 0.7,
          market: market.question, binary: true,
        });
      }
      setPolymarketResults(null);
    } catch (e) { console.error(e); }
  }

  function handleImportModel(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.teams || !json.competition) {
          setImportStatus({ ok: false, msg: 'Invalid format: needs { competition, teams }' });
          return;
        }
        const sampleKey = Object.keys(json.teams)[0];
        const sample = json.teams[sampleKey];
        if (!sample.elo || !sample.attack || !sample.defense) {
          setImportStatus({ ok: false, msg: 'Teams must have elo, attack, defense fields' });
          return;
        }
        Object.values(json.teams).forEach(t => { if (!t.scorers) t.scorers = []; });
        setCustomTeams(json);
        setImportStatus({ ok: true, msg: `Loaded ${Object.keys(json.teams).length} teams for ${json.competition}` });
      } catch {
        setImportStatus({ ok: false, msg: 'Failed to parse JSON' });
      }
    };
    reader.readAsText(file);
  }

  function clearImport() {
    setCustomTeams(null);
    setImportStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function runClaudeAnalysis() {
    if (!mlPrediction) return;
    setClaudeLoading(true);
    setClaudeAnalysis(null);

    const analysis = await getClaudeAnalysis({
      home: homeTeam, away: awayTeam, competition,
      ml: mlPrediction,
      bookmaker: bookmakerProbs,
      polymarket: polymarketData,
      firstGoal: firstGoalData,
      scorers: scorerData,
    });

    setClaudeAnalysis(analysis);
    setClaudeLoading(false);

    if (analysis && analysis.headline !== 'Claude analysis unavailable') {
      const entry = {
        id: Date.now(), home: homeTeam, away: awayTeam, competition,
        ml: mlPrediction, bookmaker: bookmakerProbs, polymarket: polymarketData,
        firstGoal: firstGoalData, scorers: scorerData,
        analysis, timestamp: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      storage.set('prediction_history', JSON.stringify(updated));
    }
  }

  function clearHistory() {
    setHistory([]);
    storage.delete('prediction_history');
  }

  function loadFromHistory(entry) {
    setCompetition(entry.competition);
    setHomeTeam(entry.home);
    setAwayTeam(entry.away);
    setPolymarketData(entry.polymarket);
    setClaudeAnalysis(entry.analysis);
  }

  const consensusOutcome = useMemo(() => {
    if (!mlPrediction) return null;
    const sources = [mlPrediction];
    if (bookmakerProbs) sources.push(bookmakerProbs);
    if (polymarketData) sources.push(polymarketData);
    const avg = {
      home: sources.reduce((s, x) => s + x.home, 0) / sources.length,
      draw: sources.reduce((s, x) => s + x.draw, 0) / sources.length,
      away: sources.reduce((s, x) => s + x.away, 0) / sources.length,
    };
    const max = Math.max(avg.home, avg.draw, avg.away);
    let label = 'Home Win';
    if (avg.draw === max) label = 'Draw';
    else if (avg.away === max) label = 'Away Win';
    return { ...avg, label, prob: max };
  }, [mlPrediction, bookmakerProbs, polymarketData]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Target className="text-cyan-400" size={28} />
              <span>Match Predictor</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">ML · Bookmaker · Polymarket · Claude · First-goal model</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCompetition('Premier League')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${competition === 'Premier League' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
              EPL
            </button>
            <button onClick={() => setCompetition('World Cup')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${competition === 'World Cup' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}>
              World Cup
            </button>
          </div>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Upload size={14} className="text-emerald-400" />
              <span className="text-xs text-zinc-300">Import trained model (models.json)</span>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportModel} className="hidden" id="model-import" />
              <label htmlFor="model-import" className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs">
                Choose file
              </label>
              {customTeams && (
                <button onClick={clearImport} className="text-xs text-zinc-500 hover:text-rose-400">Reset</button>
              )}
            </div>
          </div>
          {importStatus && (
            <div className={`mt-2 text-xs ${importStatus.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
              {importStatus.msg}
            </div>
          )}
          {customTeams && (
            <div className="mt-1 text-[10px] text-zinc-500">
              Using custom ratings for {customTeams.competition} {customTeams.version ? `(v${customTeams.version})` : ''}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Home</label>
              <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {teamList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="text-zinc-600 text-center pb-2 text-xs uppercase tracking-wider">vs</div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Away</label>
              <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:border-cyan-500 outline-none">
                {teamList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {homeTeam === awayTeam && (
            <div className="mt-2 text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={12} /> Pick different teams
            </div>
          )}
        </div>

        {consensusOutcome && (
          <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-900/50 to-zinc-900/50 border border-cyan-900/40 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Consensus Prediction</div>
                <div className="text-2xl font-bold text-zinc-100">{consensusOutcome.label}</div>
                <div className="text-sm text-cyan-400 font-mono">{(consensusOutcome.prob * 100).toFixed(1)}% avg probability</div>
              </div>
              <div className="flex gap-6">
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-1">Confidence</div>
                  <div className="text-xl font-mono text-emerald-400">{(mlPrediction.confidence * 100).toFixed(0)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 mb-1">1st Goal</div>
                  <div className="text-xl font-mono text-cyan-400">{firstGoalData.expectedMinute.toFixed(0)}'</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {mlPrediction && (
            <SourceCard title="ML Model" icon={Activity} probs={mlPrediction}
              accentColor="text-emerald-400"
              subtitle={`xG ${mlPrediction.expectedGoals.home.toFixed(2)} - ${mlPrediction.expectedGoals.away.toFixed(2)}`} />
          )}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calculator size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-zinc-200">Bookmaker</h3>
            </div>
            <div className="text-xs text-zinc-500 mb-3">
              {bookmakerProbs ? `Overround ${bookmakerProbs.overround.toFixed(2)}%` : 'Enter decimal odds'}
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              <input type="number" step="0.01" placeholder="H" value={bookmakerOdds.home}
                onChange={e => setBookmakerOdds({...bookmakerOdds, home: e.target.value})}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-center focus:border-amber-500 outline-none" />
              <input type="number" step="0.01" placeholder="D" value={bookmakerOdds.draw}
                onChange={e => setBookmakerOdds({...bookmakerOdds, draw: e.target.value})}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-center focus:border-amber-500 outline-none" />
              <input type="number" step="0.01" placeholder="A" value={bookmakerOdds.away}
                onChange={e => setBookmakerOdds({...bookmakerOdds, away: e.target.value})}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-center focus:border-amber-500 outline-none" />
            </div>
            {bookmakerProbs && (
              <>
                <ProbBar label="Home" value={bookmakerProbs.home} color="bg-emerald-500" />
                <ProbBar label="Draw" value={bookmakerProbs.draw} color="bg-amber-500" />
                <ProbBar label="Away" value={bookmakerProbs.away} color="bg-rose-500" />
              </>
            )}
          </div>
          {polymarketData ? (
            <SourceCard title="Polymarket" icon={Coins} probs={polymarketData}
              accentColor="text-violet-400"
              subtitle={polymarketData.binary ? 'Binary (inferred)' : (polymarketData.market || 'Live').slice(0, 40)} />
          ) : (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Coins size={16} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Polymarket</h3>
              </div>
              <div className="flex gap-1.5 mb-2">
                <input type="text" placeholder="Search markets…" value={polymarketSearch}
                  onChange={e => setPolymarketSearch(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs focus:border-violet-500 outline-none" />
                <button onClick={searchPolymarket} disabled={polymarketLoading}
                  className="bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 text-white px-2 rounded text-xs flex items-center gap-1">
                  {polymarketLoading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                </button>
              </div>
              {polymarketResults && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {polymarketResults.length === 0 ? (
                    <div className="text-xs text-zinc-600 text-center py-2">No matching markets</div>
                  ) : polymarketResults.map((m, i) => (
                    <button key={i} onClick={() => selectPolymarketMarket(m)}
                      className="w-full text-left bg-zinc-950/50 hover:bg-zinc-800 border border-zinc-800 rounded px-2 py-1.5 text-xs transition">
                      <div className="text-zinc-200 line-clamp-2">{m.question}</div>
                      <div className="text-zinc-500 text-[10px] mt-0.5">
                        Vol ${parseFloat(m.volume24hr || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!polymarketResults && (
                <div className="text-xs text-zinc-600 text-center py-4">Search active football markets</div>
              )}
            </div>
          )}
        </div>

        {mlPrediction && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <FirstGoalTiming data={firstGoalData} />
            <FirstScorerCard scorers={scorerData} homeTeam={homeTeam} awayTeam={awayTeam} />
          </div>
        )}

        {mlPrediction && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
            <DivergenceHeatmap ml={mlPrediction} bookmaker={bookmakerProbs} polymarket={polymarketData} />
            <div className="flex flex-col gap-3">
              <button onClick={runClaudeAnalysis} disabled={claudeLoading || !mlPrediction || homeTeam === awayTeam}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition">
                <Zap size={16} />
                {claudeLoading ? 'Analyzing…' : 'Run Claude Analysis'}
              </button>
              {!(bookmakerProbs || polymarketData) && (
                <div className="text-xs text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded p-3 flex gap-2">
                  <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>Add bookmaker odds and/or load a Polymarket market for richer divergence analysis.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {(claudeLoading || claudeAnalysis) && (
          <div className="mb-4"><ClaudeAnalysis analysis={claudeAnalysis} loading={claudeLoading} /></div>
        )}

        {history.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <BarChart3 size={16} className="text-zinc-400" />
                Recent Predictions ({history.length})
              </h3>
              <button onClick={clearHistory} className="text-xs text-zinc-500 hover:text-rose-400 flex items-center gap-1">
                <Trash2 size={12} /> Clear
              </button>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {history.map(entry => (
                <button key={entry.id} onClick={() => loadFromHistory(entry)}
                  className="w-full text-left bg-zinc-950/50 hover:bg-zinc-800/50 border border-zinc-800 rounded px-3 py-2 text-xs transition flex items-center justify-between">
                  <div>
                    <div className="text-zinc-200">{entry.home} vs {entry.away}</div>
                    <div className="text-zinc-500 text-[10px]">{entry.competition} · {new Date(entry.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[10px]">{entry.analysis?.recommendation?.verdict || '—'}</span>
                    <ChevronRight size={14} className="text-zinc-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="mt-6 text-center text-[10px] text-zinc-600">
          Statistical predictions only — not betting advice. Top scorers seeded for v1; replace via JSON import.
        </footer>
      </div>
    </div>
  );
}