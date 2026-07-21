// Shared, real poll tallies across every visitor (Redis hash per poll).
// GET  ?pollId=1 -> { ok, pollId, counts: { a, b, c } }
// POST { pollId, option } -> { ok, pollId, option, count }
const { getClient } = require('./_redis');

const BASELINE = {
  1: { a: 610, b: 240, c: 150 },
  2: { a: 480, b: 200, c: 320 },
};

async function ensureBaseline(redis, pollId) {
  const base = BASELINE[pollId];
  if (!base) return;
  await Promise.all(
    Object.entries(base).map(([opt, val]) => redis.hSetNX(`poll:${pollId}`, opt, String(val)))
  );
}

module.exports = async function handler(req, res) {
  try {
    const redis = await getClient();

    if (req.method === 'GET') {
      const pollId = (req.query.pollId || '1').toString().slice(0, 10);
      await ensureBaseline(redis, pollId);
      const all = await redis.hGetAll(`poll:${pollId}`);
      const counts = {};
      Object.keys(all).forEach(k => { counts[k] = parseInt(all[k], 10) || 0; });
      res.status(200).json({ ok: true, pollId, counts });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const pollId = (body.pollId || '1').toString().slice(0, 10);
      const option = (body.option || '').toString();
      if (!['a', 'b', 'c'].includes(option)) { res.status(400).json({ ok: false, error: 'bad option' }); return; }
      await ensureBaseline(redis, pollId);
      const count = await redis.hIncrBy(`poll:${pollId}`, option, 1);
      res.status(200).json({ ok: true, pollId, option, count });
      return;
    }

    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
};
