// Shared, real comments per post, visible to every visitor (Redis list).
// GET ?postId=X -> { ok, comments: [...] }
// POST { postId, name, text } -> { ok, comment }
const { getClient } = require('./_redis');

module.exports = async function handler(req, res) {
  try {
    const redis = await getClient();

    if (req.method === 'GET') {
      const postId = (req.query.postId || '').toString().slice(0, 60);
      if (!postId) { res.status(400).json({ ok: false, error: 'missing postId' }); return; }
      const raw = await redis.lRange(`comments:${postId}`, 0, 99);
      const comments = raw.map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      res.status(200).json({ ok: true, comments });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const postId = (body.postId || '').toString().slice(0, 60);
      const text = (body.text || '').toString().trim().slice(0, 300);
      if (!postId || !text) { res.status(400).json({ ok: false, error: 'missing fields' }); return; }
      const comment = {
        name: (body.name || 'אורח').toString().slice(0, 40),
        initials: (body.initials || 'א').toString().slice(0, 2),
        text,
        createdAt: new Date().toISOString(),
      };
      await redis.rPush(`comments:${postId}`, JSON.stringify(comment));
      res.status(200).json({ ok: true, comment });
      return;
    }

    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
};
