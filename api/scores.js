// Real, current match data via TheSportsDB's free public API — no key,
// no signup, no cost. Not minute-by-minute live in-play scores (that
// needs their paid tier), but genuinely current: the real last result
// and real next fixture for each club, refreshed continuously.
//
// Team IDs are hardcoded rather than resolved by live search: TheSportsDB's
// free-text team search is inconsistent for a few of these clubs (it can
// return an unrelated same-name basketball club, or miss a club entirely
// depending on exact spelling/hyphenation). Each ID below was verified
// directly against TheSportsDB's own league event listings.
const TSDB_TEAM_ID = {
  maccabi_tel_aviv: '134315',
  hapoel_tel_aviv: '134124',
  maccabi_haifa: '134400',
  hapoel_haifa: '135995',
  beitar: '135992',
  hapoel_jerusalem: '141235',
  hapoel_beer_sheva: '134799',
  bnei_sakhnin: '135994',
  maccabi_netanya: '134087',
  hapoel_petah_tikva: '141238',
  ms_ashdod: '135991',
  maccabi_bnei_reina: '141801',
  ironi_tiberias: '146401',
  ironi_kiryat_shmona: '133950',
};

const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

async function tsdb(path) {
  const r = await fetch(TSDB_BASE + path);
  if (!r.ok) throw new Error('thesportsdb status ' + r.status);
  return r.json();
}

function pickEvent(e) {
  if (!e) return null;
  return {
    date: e.dateEvent,
    time: e.strTime || null,
    home: e.strHomeTeam,
    away: e.strAwayTeam,
    homeScore: e.intHomeScore,
    awayScore: e.intAwayScore,
    league: e.strLeague,
    venue: e.strVenue || null,
  };
}

module.exports = async function handler(req, res) {
  try {
    const clubId = (req.query.club || '').toString();
    const teamId = TSDB_TEAM_ID[clubId];
    if (!teamId) {
      res.status(200).json({ configured: true, found: false });
      return;
    }

    const [lastData, nextData] = await Promise.all([
      tsdb(`/eventslast.php?id=${teamId}`),
      tsdb(`/eventsnext.php?id=${teamId}`),
    ]);

    const last = pickEvent((lastData.results || [])[0]);
    const next = pickEvent((nextData.events || [])[0]);

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');
    res.status(200).json({ configured: true, found: true, last, next });
  } catch (err) {
    res.status(200).json({ configured: true, error: String(err && err.message || err) });
  }
};
