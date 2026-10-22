# 005 — Fetch real bills on my machine, ship them as a file

**Decision** — A script (`scripts/refresh-bills.mjs`) reads the Congress.gov API key from a private `.env.local` file, downloads up to 8 real bills per bin, and writes them into `bills.json`. The public game reads that file. The key is never in the page.

**Why this came up** — The game's promise is "every crate is a real bill", and the site is about to go public on Vercel. The original design put the key in `main.js`, the game's main script, which every visitor's browser downloads.

**Options**
- **Fetch script, ship the file.** The key stays on one laptop, and visitors make zero API calls, so there's no shared limit to run out. Cost: bills are only as fresh as the last time the script ran (by hand for now; a scheduled job later).
- **Key in `main.js`.** Live bills in every browser. Cost: anyone can copy the key with View Source. Visitors also share 1,000 requests an hour, and each first visit spends about 50–150, so roughly 7–20 new visitors an hour would drain it. After that, everyone silently gets the made-up sample bills.
- **A small server function that holds the key.** Live data with the key hidden. Cost: hosting, caching and more moving parts for a game that doesn't need minute-by-minute freshness.

**What we chose and why** — The fetch script (Tarik's call, from options Claude drafted). Bills change over days, not seconds, so a daily snapshot keeps the promise at no risk.

**What we gave up** — Freshness and automation. Until a scheduled job exists, someone has to rerun the script. The browser's live-fetch code stays in place with an empty key, unused on the public site.

**How we'll know if this was right** — After deploy, `https://<site>/.env.local` returns 404, the page footer note says "real bills from congress.gov · updated <date>", and the API key's usage stays near zero no matter how many people play.

**What actually happened** —
