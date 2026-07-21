// Real fixture data via API-Football (https://www.api-football.com).
// Requires an API_FOOTBALL_KEY environment variable set in the Vercel
// project (Settings -> Environment Variables). Until that key exists this
// endpoint always answers { configured:false } and the app quietly keeps
// showing its simulated demo data instead — nothing breaks either way.
const API_BASE = 'https://v3.football.api-sports.io';

async function apiFootball(path, key) {
  const r = await fetch(API_BASE + path, { headers: { 'x-apisports-key': key } });
  if (!r.ok) throw new Error('api-football status ' + r.status);
  return r.json();
}

// Best-effort cache for the lifetime of a warm serverless instance only —
// not guaranteed across invocations, just cuts down repeat lookups.
const teamCache = new Map();

async function resolveTeamId(name, key) {
  if (teamCache.has(name)) return teamCache.get(name);
  const data = await apiFootball(`/teams?search=${encodeURIComponent(name)}&country=Israel`, key);
  const team = data.response && data.response[0] && data.response[0].team;
  const id = team ? team.id : null;
  teamCache.set(name, id);
  return id;
}

module.exports = async function handler(req, res) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    res.status(200).json({ configured: false });
    return;
  }
  try {
    const teamName = (req.query.team || '').toString();
    if (!teamName) {
      res.status(400).json({ configured: true, error: 'missing "team" query param' });
      return;
    }
    const teamId = await resolveTeamId(teamName, key);
    if (!teamId) {
      res.status(200).json({ configured: true, found: false });
      return;
    }

    const [nextData, lastData] = await Promise.all([
      apiFootball(`/fixtures?team=${teamId}&next=1`, key),
      apiFootball(`/fixtures?team=${teamId}&last=1`, key),
    ]);

    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.status(200).json({
      configured: true,
      found: true,
      teamId,
      next: (nextData.response && nextData.response[0]) || null,
      last: (lastData.response && lastData.response[0]) || null,
    });
  } catch (err) {
    res.status(200).json({ configured: true, error: String(err && err.message || err) });
  }
}
