// Shared community feed, real and persistent across every visitor (Redis list).
// GET  -> { ok, posts: [...] } newest first
// POST { text, topic, author } -> { ok, post }
const { getClient } = require('./_redis');

module.exports = async function handler(req, res) {
  try {
    const redis = await getClient();

    if (req.method === 'GET') {
      const raw = await redis.lRange('posts:feed', 0, 49);
      const posts = raw.map(s => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
      res.status(200).json({ ok: true, posts });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const text = (body.text || '').toString().trim().slice(0, 500);
      if (!text) { res.status(400).json({ ok: false, error: 'empty text' }); return; }
      const post = {
        id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        text,
        topic: (body.topic || 'all').toString().slice(0, 30),
        author: (body.author || 'אורח מ-FanZone').toString().slice(0, 40),
        createdAt: new Date().toISOString(),
      };
      await redis.lPush('posts:feed', JSON.stringify(post));
      await redis.lTrim('posts:feed', 0, 199);
      res.status(200).json({ ok: true, post });
      return;
    }

    res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (err) {
    res.status(200).json({ ok: false, error: String(err && err.message || err) });
  }
};
