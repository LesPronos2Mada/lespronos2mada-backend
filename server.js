import express from "express";
import cors from "cors";
import compression from "compression";
import fetch from "node-fetch";

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

// ✅ API-Football
const API_BASE = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

// ✅ Vérification clé
app.get("/api/debug-key", (req, res) => {
  res.json({ key: API_KEY || null });
});

// ✅ Santé du serveur
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ Liste des ligues
app.get("/api/leagues", (req, res) => {
  res.json([
    { id: 61, name: "Ligue 1" },
    { id: 39, name: "Premier League" },
    { id: 140, name: "LaLiga" },
    { id: 135, name: "Serie A" },
    { id: 78, name: "Bundesliga" },
    { id: 2, name: "Ligue des Champions" }
  ]);
});

// ✅ Helper pour API-Football
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const r = await fetch(url, {
    headers: { "x-apisports-key": API_KEY }
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`API error ${r.status} - ${text}`);
  }

  return r.json();
}

// ✅ Fixtures (10 prochains matchs si aucun aujourd'hui)
app.get("/api/fixtures", async (req, res) => {
  try {
    const { league } = req.query;
    const season = new Date().getFullYear();

    if (!league) return res.status(400).json({ error: "league required" });

    const data = await apiGet("/fixtures", {
      league,
      season,
      next: 10
    });

    const fixtures = (data.response || []).map(m => ({
      id: m.fixture.id,
      date: m.fixture.date,
      home: m.teams.home.name,
      away: m.teams.away.name
    }));

    res.json(fixtures);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ✅ Port Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("✅ LP2M backend running on " + PORT));
