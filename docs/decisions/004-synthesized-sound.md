# 004 — Every sound is synthesized in code

**Decision** — All ten sound effects are generated live by the browser's Web Audio API (a built-in synthesizer you control from code). There are no audio files. The sounds are: gavel, launch, pick-up, bin hover, correct, wrong, plop, click, win fanfare, and the sad trombone on a loss.

**Why this came up** — Tarik asked for fun sound effects. The project's rule is that everything is made in code, and the game may later ship to web game portals, which forbid loading media from other servers.

**Options**
- **Synthesized in code.** Zero files and zero licences to check; pitch can react to play (each correct answer in a streak rings a note higher). Cost: sounds are simpler and more "toy-like" than recorded ones.
- **Free sound-library files.** Richer sounds. Cost: each file's licence must be checked, the download gets bigger, and it breaks the zero-files rule.
- **Generated audio files from an AI tool.** Custom sounds. Cost: same file and licence issues, plus a pipeline to regenerate them.

**What we chose and why** — Synthesized (Claude's call). It fits the rule, and it fits the look: a toy world gets toy sounds. Treated like station imaging (short stingers, one per event, nothing playing underneath), it stays out of the way.

**What we gave up** — Musical richness and any background music. Browsers also block sound until the first click, so the landing page is silent and sound starts on PLAY.

**How we'll know if this was right** — In playtests, nobody mutes it in the first round, and someone mentions the trombone.

**What actually happened** —
