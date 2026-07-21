// Real football news WITH real article images, no API key required.
// Primary source: Walla Sport's own "Israeli football" RSS feed — real
// direct article links (not Google's obfuscated redirect) and a real
// <enclosure> image per item. Falls back to Google News' public RSS
// search if Walla is unreachable, and filters to the requested club when
// possible so the app shows relevant news for whoever is selected.
const WALLA_FOOTBALL_FEED = 'https://rss.walla.co.il/feed/156'; // כדורגל ישראלי

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function clean(s) {
  return s.replace('<![CDATA[', '').replace(']]>', '').trim();
}
function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? clean(m[1]) : '';
}
function pickAttr(block, tag, attr) {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^>]*/?>`));
  return m ? m[1] : '';
}

async function fetchWalla() {
  const r = await fetch(WALLA_FOOTBALL_FEED, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('walla status ' + r.status);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const block = m[1];
    const description = pick(block, 'description');
    const imgMatch = description.match(/src="([^"]+)"/);
    return {
      title: pick(block, 'title'),
      link: pick(block, 'link'),
      pubDate: pick(block, 'pubDate'),
      image: pickAttr(block, 'enclosure', 'url') || (imgMatch ? imgMatch[1] : ''),
      excerpt: stripTags(description).slice(0, 220),
      source: 'וואלה ספורט',
    };
  });
}

async function fetchGoogleNewsFallback(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=he&gl=IL&ceid=IL:he`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error('gnews status ' + r.status);
  const xml = await r.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => {
    const block = m[1];
    const rawTitle = pick(block, 'title');
    const parts = rawTitle.split(' - ');
    const source = parts.length > 1 ? parts.pop().trim() : '';
    return {
      title: parts.join(' - ').trim() || rawTitle,
      link: pick(block, 'link'),
      pubDate: pick(block, 'pubDate'),
      image: '',
      excerpt: '',
      source,
    };
  });
}

module.exports = async function handler(req, res) {
  try {
    const club = (req.query.club || '').toString().slice(0, 60);
    let items = [];
    try {
      items = await fetchWalla();
    } catch (e) {
      items = await fetchGoogleNewsFallback((club || 'ליגת העל') + ' כדורגל');
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
      res.status(200).json({ ok: true, source: 'google-news-fallback', items });
      return;
    }

    let result = items;
    if (club) {
      const short = club.split(' ')[club.split(' ').length - 1]; // last word, usually the distinctive part
      const matches = items.filter(it =>
        it.title.includes(club) || it.excerpt.includes(club) ||
        (short.length > 2 && (it.title.includes(short) || it.excerpt.includes(short)))
      );
      if (matches.length) result = matches;
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({ ok: true, source: 'walla-sport', items: result.slice(0, 10) });
  } catch (err) {
    res.status(200).json({ ok: false, items: [], error: String(err && err.message || err) });
  }
};
