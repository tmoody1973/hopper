# 002 — The Capitol launches the bills and is the progress meter

**Decision** — A low-poly Capitol, built in code, sits at the back of the Mall. Every bill floats out of its dome, the dome gains one ring per correct sort, the Statue of Freedom goes on top at 25, and a rain cloud parks over it on a loss.

**Why this came up** — The new art style needed a centrepiece, and a Capitol that only sits there is decoration. The game also had an invisible 5-second timer and a score that lived only in a corner number.

**Options**
- **Launcher + progress meter.** The timer becomes something you see and hear, and progress becomes a building going up. Cost: about 300 lines of code, and a new risk that bill cards cover the dome.
- **Launcher only.** Half the work; the rhythm is still visible. Cost: progress stays a number in the corner.
- **Backdrop only.** Cheapest. Cost: it doesn't change the game at all.

**What we chose and why** — Launcher + progress (Tarik's call, from options Claude drafted). It turns the score into the Capitol being finished, which is the payoff a player remembers.

**What we gave up** — Bills now fall only in two lanes either side of the dome, so their title cards never hide it (the test checks this: 0 of 27 drags crossed the dome's centre). The centre of the play area is never used for falling bills. The dome sits at the top of the screen while the bins sit at the bottom, so it's a glance reward. The real score stays in the corner.

**How we'll know if this was right** — Playtesters mention the dome without being asked ("I wanted to finish it"), and nobody loses track of a bill behind the Capitol.

**What actually happened** —
