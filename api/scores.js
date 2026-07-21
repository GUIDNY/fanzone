// Real historical fixture data via API-Football (https://www.api-football.com).
// Requires an API_FOOTBALL_KEY environment variable (Vercel Settings ->
// Environment Variables). Until it exists, this endpoint answers
// { configured:false } and the app quietly keeps its simulated demo.
//
// Note: the free API-Football plan does not include the current season,
// live scores, or the next/last shortcut params — only seasons 2022-2024.
// So instead of "next match" (which the free plan can't provide), this
// surfaces something still genuinely real: the most recent finished
// result from the 2024/25 season, and the last head-to-head meeting
// between the selected club and its rival when one occurred that season.
const API_BASE = 'https://v3.football.api-sports.io';
const SEASON = 2024; // most recent season available on the free plan

async function apiFootball(path, key) {
  const r = await fetch(API_BASE + path, { headers: { 'x-apisports-key': key } });
  if (!r.ok) throw new Error('api-football status ' + r.status);
  return r.json();
}

const teamCache = new Map();
async function resolveTeamId(name, key) {
  if (teamCache.has(name)) return teamCache.get(name);
  // api-football rejects combining "search" with "country" in one call,
  // so search alone and prefer an Israeli match from the results.
  const data = await apiFootball(`/teams?search=${encodeURIComponent(name)}`, key);
  const list = (data.response || []).map(r => r.team).filter(Boolean);
  const team = list.find(t => t.country === 'Israel') || list[0];
  const id = team ? team.id : null;
  teamCache.set(name, id);
  return id;
}

const fixturesCache = new Map();
async function fetchSeasonFixtures(teamId, key) {
  const cacheKey = String(teamId);
  if (fixturesCache.has(cacheKey)) return fixturesCache.get(cacheKey);
  const data = await apiFootball(`/fixtures?team=${teamId}&season=${SEASON}`, key);
  const list = (data.response || []).filter(f => f.fixture && f.fixture.status && f.fixture.status.short === 'FT');
  list.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
  fixturesCache.set(cacheKey, list);
  return list;
}

module.exports = async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    res.status(200).json({ configured: false });
    return;
  }
  try {
    const teamName = (req.query.team || '').toString();
    const rivalName = (req.query.rival || '').toString();
    if (!teamName) {
      res.status(400).json({ configured: true, error: 'missing "team" query param' });
      return;
    }

    const teamId = await resolveTeamId(teamName, key);
    if (!teamId) {
      res.status(200).json({ configured: true, found: false });
      return;
    }

    const fixtures = await fetchSeasonFixtures(teamId, key);
    if (!fixtures.length) {
      res.status(200).json({ configured: true, found: false, season: SEASON });
      return;
    }

    let headToHead = null;
    if (rivalName) {
      const rivalId = await resolveTeamId(rivalName, key);
      if (rivalId) {
        headToHead = fixtures.find(f => f.teams.home.id === rivalId || f.teams.away.id === rivalId) || null;
      }
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.status(200).json({
      configured: true,
      found: true,
      season: SEASON,
      teamId,
      lastMatch: fixtures[0] || null,
      headToHead,
    });
  } catch (err) {
    res.status(200).json({ configured: true, error: String(err && err.message || err) });
  }
};
