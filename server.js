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

// ✅ Debug clé
app.get("/api/debug-key", (req, res) => {
  res.json({ keyLoaded: API_KEY ? true : false, key: API_KEY ? "OK" : null });
});

// ✅ Santé
app.get("/api/health", (req, res) => res.json({ ok: true }));

// ✅ Leagues
app.get("/api/leagues", (req, res) => {
  res.json([
    { id: 61, name: "Ligue 1" },
    { id: 39, name: "Premier League" },
    { id: 140, name: "LaLiga" },
    { id: 135, name: "Serie A" },
    { id: 78, name: "Bundesliga" },
    { id: 667, name: "Ligue des Champions" }
  ]);
});

// ✅ Helper API
async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const r = await fetch(url, { headers: { "x-apisports-key": API_KEY } });

  const text = await r.text(); // ✅ On lit tout brut
  let json;
  try { json = JSON.parse(text); } catch { json = text; }

  return { status: r.status, raw: text, json };
}

// ✅ Fixtures + debug
app.get("/api/fixtures", async (req, res) => {
  try {
    const { league, debug } = req.query;
    const season = new Date().getFullYear();

    if (!league) return res.status(400).json({ error: "league required" });

    const data = await apiGet("/fixtures", { league, season, next: 10 });

    // ✅ Mode debug → on renvoie TOUTE la réponse brute
    if (debug === "1") {
      return res.json(data);
    }

    const fixtures = (data.json?.response || []).map(m => ({
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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("✅ LP2M backend running on " + PORT"));
