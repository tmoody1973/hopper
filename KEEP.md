# KEEP.md — must keep working exactly as it is

Paste this into every brief. Add a line whenever a playtest accepts a behaviour.

- index.html is the entry point; three.js loads from ./lib through the importmap; no other outside scripts.
- Every model, texture and sound is made in code. No image or audio files.
- CONFIG.API_KEY sits at the top of main.js. Empty key, any failed fetch, or fewer than 30 usable live
  bills → silent fallback to ./bills.json. Network failures never throw to the console.
- Only bills in the 8 bin policy areas are used. The deck is shuffled and reshuffled when it runs out.
- A bill launches from the Capitol dome every 5 s, then falls slowly under a balloon with its title card.
- Crate size follows title length. Crates fall as plain wood; the bin-colour hint fades in only over the last
  third of the fall. Every falling card shows the title plus one plain line (CRS summary or official title).
- refresh-bills drops any bill whose card can't say what it does (no summary, no official title, short title).
- End of round: "See your N bills" opens the Docket (mistakes first) with what each bill would do, where it
  is now, and who's behind it. The end card reports right answers made before the hint appeared.
- Drag with mouse or touch (raycast + slanted drag plane). One drag at a time.
- Each bin's drop zone is a flat panel in one shared plane: a pointer can only hit one bin.
- Correct: bin glows green, +1, balloon pops, dome gains a ring. Wrong: bin flashes red, toast names the
  real policy area for 2 s, a marker lands on that bin, the right bin glows gold.
- A bill that lands unsorted vanishes and counts as a miss, nothing more.
- Win at 25 correct (statue + fireworks). Lose at 3 wrong in any one bin (rain cloud).
- End card shows sorted and missed; "Play again" and "Back to the page" work without a reload.
- PLAY is visible without scrolling on a phone and starts a round in one tap.
- Rule numbers on the page come from rules.js; the "try one bill" toy grades with isCorrectSort.
- Sound starts only after PLAY; M or the button mutes; the setting persists.
- Esc, P or the pause button pauses; switching tabs or windows auto-pauses. The pause card is opaque so
  titles can't be read ahead, and nothing moves or spawns until Resume.
- Nothing ever covers the 3D view during play: the HUD lives in a top bar (score, misses, feedback, strikes)
  and a bottom bar (full bill title, pause, sound). Clouds stay outside the island. A title card is fully
  on screen within ~1 s of its bill starting to fall, and all 8 bins stay in view, from 900 px wide up.
- Readable at 1280×720. Nothing that carries information under 15px; all text ≥ 4.5:1 contrast.
- bills.json: up to 15 real bills per bin, 119th Congress first, 118th only to fill gaps; cards show the Congress.
- The API key lives only in .env.local (git- and vercel-ignored). scripts/refresh-bills.mjs writes real bills
  into bills.json; the page labels them real, and labels the made-up set as sample.
- Deploys: .vercelignore keeps .env*, scripts/, docs/, *.md and .remember/ off Vercel. After every deploy,
  https://hopper-rouge.vercel.app/.env.local must return 404. Refresh bills with `npm run refresh-bills`,
  then `vercel deploy --prod`.
- ?capture=<scene> (capture.js) must keep working: seeded RNG, no real-time loop, step() per frame. The
  launch video in video/ is re-recorded from it. video/ is never deployed (.vercelignore).
