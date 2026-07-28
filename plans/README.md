# Bloodwork animation plans

All plans were audited against commit `7490320`.

| Plan | Title                                | Severity | Status |
| ---- | ------------------------------------ | -------- | ------ |
| 001  | Disable chart tooltip motion         | HIGH     | DONE   |
| 002  | Complete reduced-motion feedback     | MEDIUM   | DONE   |
| 003  | Unify control motion                 | MEDIUM   | DONE   |
| 004  | Use starting style for health import | LOW      | DONE   |
| 005  | Reveal the appended variable         | LOW      | DONE   |

## Recommended execution order

1. `001-disable-chart-tooltip-motion.md`
2. `002-complete-reduced-motion-feedback.md`
3. `003-unify-control-motion.md`
4. `004-use-starting-style-for-health-import.md`
5. `005-reveal-appended-variable.md`

Plan 001 is independent and removes the only high-severity motion defect.
Plan 002 establishes correct reduced-motion selectors and state hooks. Plan
003 then replaces the overlapping control rules and creates shared duration
tokens. Plans 004 and 005 depend on both the reduced-motion pattern from plan
002 and the duration tokens from plan 003.

Execute one plan at a time. Run `bun run check` after each coherent change and
`bun run check:full` after the full sequence. Mark each plan `DONE` only after
its mechanical and browser feel checks pass.
