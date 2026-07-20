# FanZone

Interactive local prototype of **FanZone** — a Hebrew RTL football fan-community app (matchday companion, live match room, community feed, Fan Points, and profile).

Live demo: enable GitHub Pages on this repo (Settings → Pages → Deploy from branch `main` / root) to get a public URL, or just open `index.html` in a browser.

## What's here

A single self-contained `index.html` — no build step, no dependencies beyond Google Fonts (Rubik + Heebo).

- **Club picker onboarding** — choose any of the 14 real Ligat Ha'al (Israeli Premier League) clubs; the whole app re-themes to that club's colors (button accents, crests, tab highlight), with a real rival club auto-assigned for the match card.
- **Home** — dynamic hero card (before / live / after match states via the demo switcher at the top), poll, news, community highlight, league table, weekly challenge.
- **Match Center** — pre-match overview/lineup/fans/info tabs, a live scoreboard with event timeline and a working live chat (slow-mode, quick reactions, sort), and post-match player ratings with an MVP pick.
- **Community** — filterable feed, search, like/comment/share/report, and a create-post flow.
- **Fan Points** — points, streak, challenges, badges, and a transaction history, all wired to real point payouts.
- **Profile** — tabs, settings sheets (notifications/privacy/support), and a two-step delete-account confirmation.

All interaction state (likes, points, votes, ratings, created posts, club choice) persists to the browser's `localStorage`, so it survives a refresh. There is no backend — this is a client-side simulation for design/demo purposes.

Fully responsive: on a phone-width viewport the app fills the real screen edge-to-edge; on desktop it renders inside a decorative phone-frame mockup with a few extra "prototype lab" controls (match-phase switcher) for demoing states quickly.
