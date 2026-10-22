# 007 — The colour hint arrives late

**Decision** — Crates fall as plain wood and only blush their bin's colour over the last third of the fall. The end card and the Docket count the right answers a player made **before** any colour appeared.

**Why this came up** — The original brief asked for a subtle colour hint on each crate. In practice, when a title is vague, the colour becomes the only reliable signal. Players can then learn "orange crate, orange bin" instead of anything about the bills, which defeats the point of the game.

**Options**
- **Late hint.** The colour exists, but only near the ground, so reading is the faster way and colour is a last-second rescue. Cost: rounds get harder, especially the first one.
- **Fading hint.** Strong colour for the first few bills of a round, gone by about the 15th. It teaches the colours, then removes the crutch. Cost: colour-matching still works early in every round.
- **No hint.** The purest test of reading. Cost: it breaks the original brief and makes the first round much harder.

**What we chose and why** — Late hint (Tarik's call, from options Claude drafted). It keeps the brief's hint while making reading the winning strategy. The "read before the hint" count turns that into a number both players and we can see.

**What we gave up** — Ease. A new player who doesn't read gets no help until the crate is low. The knob is `HINT_START` in `main.js` (currently two thirds of the way down), which can be lowered if playtests show it's too hard.

**How we'll know if this was right** — In real playtests, most right answers happen before the hint appears, and rounds still end in a win often enough that people play again.

**What actually happened** —
