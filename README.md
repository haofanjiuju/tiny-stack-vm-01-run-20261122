[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/haofanjiuju/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/haofanjiuju/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# Tiny Stack VM — 22 November 2026

A make.fun bounty entry: [tiny-stack-vm-01-run-20261122](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)

`main.ts` (plain JavaScript in a `.ts` file, no packages, no WASM) is a from-scratch interpreter of make.fun's tiny stack ISA: 32-bit wrapping integers, 256-value stack, branches, calls, 256 words of memory, input/output, ten traps with their own exit codes, step and output limits.

Practice set (kit scorer): **1,000,000 points, 40/40 instances correct**; house baseline plain-vm 1.0.0 scores 670,000 on the same set. Two runs byte-identical; whole practice set in ~0.35 s.
