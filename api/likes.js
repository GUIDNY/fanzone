// Shared, real like counts across every visitor (Redis hash).
// GET  -> { ok, counts: { postId: count, ... } }
// POST { postId, delta:1|-1 } -> { ok, postId, count }
const { getClient } = require('./_redis');

const BASELINE = { p1: 128, p2: 212, p3: 340, p4: 76, p5: 64 };

async function ensureBaseline(redis) {
  await Promise.all(
    Object.entries(BASELINE).map(([id, val]) => redis.hSetNX('likes:counts', id, String(val)))
  );
}

module.exports = async function handler(req, res) {
  try {
    const redis = await getClient();
    await ensureBaseline(redis);

    if (req.method === 'GET') {
      const all = await redis.hGetAll('likes:counts');
      const counts = {};
      Object.keys(all).forEach(k => { counts[k] = parseInt(all[k], 10) || 0; });
      res.status(200).json({ ok: true, counts });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const id = (body.postId || '').toString().slice(0, 60);
      const delta = body.delta === -1 ? -1 : 1;
      if (!id) { res.status(400).json({ ok: false, error: 'missing postId' }); return; }
      if (!(id in BASELINE)) await redis.hSetNX('likes:counts', id, '0');
      const count = await redis.hIncrBy('likes:counts', id, delta);
      res.status(200).json({ ok: true, postId: id, count });
      return;
    }

    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
};
