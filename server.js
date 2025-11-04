import express from "express";
import cors from "cors";
import compression from "compression";
import fetch from "node-fetch";

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

// Helper GET API-Football
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = await fetch(url, { headers: { "x-apisports-key": API_KEY } });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

// ✅ Health
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ Liste des leagues → route demandée par TON FRONT
app.get("/api/leagues", async (req, res) => {
  try {
    const j = await apiGet("/leagues");
    const out = j.response
      .filter(l => [61,39,140,135,78,2].includes(l.league.id)) // L1, PL, Liga, Serie A, Bundesliga, LDC
      .map(l => ({
        id: l.league.id,
        name: l.league.name
      }));
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Fixtures PAR LEAGUE → route demandée par TON FRONT : /fixtures/61
app.get("/api/fixtures/:leagueId", async (req, res) => {
  try {
    const leagueId = req.params.leagueId;
    const season = new Date().getFullYear();
    const date = new Date().toISOString().slice(0, 10);

    const j = await apiGet("/fixtures", {
      league: leagueId,
      date,
      season
    });

    const out = (j.response || []).map(m => ({
      id: m.fixture.id,
      date: m.fixture.date,
      league: m.league.name,
      home: m.teams.home,
      away: m.teams.away
    }));

    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Probabilités (tu l’avais déjà)
function fact(n){ let r=1; for(let i=2;i<=n;i++) r*=i; return r; }
function pois(k,lambda){ return Math.exp(-lambda)*Math.pow(lambda,k)/fact(k); }

app.get("/api/probabilities", async (req, res) => {
  try {
    const { league, home, away, season } = req.query;
    if (!league || !home || !away)
      return res.status(400).json({ error: "league, home, away required" });

    const yr = season || new Date().getFullYear();

    const [H, A] = await Promise.all([
      apiGet("/teams/statistics", { league, team: home, season: yr }),
      apiGet("/teams/statistics", { league, team: away, season: yr })
    ]);

    const xgH = H.response?.goals?.for?.average?.total || 1.3;
    const xgA = A.response?.goals?.for?.average?.total || 1.2;

    let pH=0, pD=0, pA=0, over25=0;
    for (let s1=0; s1<=7; s1++){
      for (let s2=0; s2<=7; s2++){
        const p = pois(s1,xgH) * pois(s2,xgA);
        if (s1>s2) pH+=p; else if (s1===s2) pD+=p; else pA+=p;
        if (s1+s2>=3) over25+=p;
      }
    }
    res.json({ xgHome:xgH, xgAway:xgA, pH, pD, pA, over25 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Lancement serveur Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("LP2M backend up on " + PORT));
