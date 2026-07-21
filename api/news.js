// Real football news, no API key required.
// Proxies Google News' public RSS search (server-side, to dodge CORS) and
// returns a small clean JSON list of real headlines from real Israeli
// sports outlets (Sport5, Walla Sport, Ynet, Sport1, Kan, etc).
module.exports = async function handler(req, res) {
  try {
    const query = (req.query.q || 'ליגת העל כדורגל').toString().slice(0, 120);
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=he&gl=IL&ceid=IL:he`;

    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!upstream.ok) throw new Error('upstream status ' + upstream.status);
    const xml = await upstream.text();

    const clean = (s) => s.replace('<![CDATA[', '').replace(']]>', '').trim();
    const pick = (block, tag) => {
      const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? clean(m[1]) : '';
    };

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .slice(0, 10)
      .map(m => {
        const block = m[1];
        const rawTitle = pick(block, 'title');
        const parts = rawTitle.split(' - ');
        const source = parts.length > 1 ? parts.pop().trim() : '';
        const title = parts.join(' - ').trim();
        return {
          title: title || rawTitle,
          source,
          link: pick(block, 'link'),
          pubDate: pick(block, 'pubDate'),
        };
      })
      .filter(it => it.title);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ ok: true, items });
  } catch (err) {
    res.status(200).json({ ok: false, items: [], error: String(err && err.message || err) });
  }
}
