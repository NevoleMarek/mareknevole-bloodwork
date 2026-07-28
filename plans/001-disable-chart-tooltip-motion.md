# 001 — Disable chart tooltip motion

- **Status**: TODO
- **Commit**: 7490320
- **Severity**: HIGH
- **Category**: Purpose & frequency; easing & duration
- **Estimated scope**: 2 source files, 2 existing test files; under 20 changed lines

## Problem

The plotted lines are deliberately static, but both health-chart tooltips omit
an animation override:

```tsx
// components/dashboard/health-chart.tsx:74 — current
<Tooltip
  cursor={{ stroke: "rgba(20, 119, 95, 0.16)" }}
  contentStyle={{
```

```tsx
// components/dashboard/blood-pressure-chart.tsx:86 — current
<Tooltip
  cursor={{ stroke: "rgba(20, 119, 95, 0.16)" }}
  contentStyle={{
```

The locked Recharts 3.8.0 dependency supplies these defaults:

```js
// node_modules/recharts/es6/component/Tooltip.js:41 — dependency default
animationDuration: 400,
animationEasing: 'ease',
isAnimationActive: 'auto',
```

`TooltipBoundingBox` turns those defaults into a `transform 400ms ease`
transition while the tooltip is active. Pointer movement can update the
tooltip hundreds of times in one chart-hover session. The motion adds lag
rather than meaning, exceeds the 300ms UI ceiling, and conflicts with the
documented rule that medical charts do not animate.

## Target

Disable tooltip motion outright in both chart components:

```tsx
<Tooltip
  isAnimationActive={false}
  cursor={{ stroke: "rgba(20, 119, 95, 0.16)" }}
  contentStyle={{
```

Do not replace the default with a shorter tween. This is high-frequency
coordinate feedback, so the tooltip must track the active point immediately.

## Repo conventions to follow

- Recharts line animation is already disabled explicitly in
  `components/dashboard/health-chart.tsx:93`,
  `components/dashboard/health-chart.tsx:104`, and
  `components/dashboard/blood-pressure-chart.tsx:105`.
- `specs/style.md` already says, “Medical charts and trend lines never
  animate.” This change implements that existing decision; it does not change
  the visual specification.
- Keep the current tooltip content, cursor, typography, and chart data
  behavior unchanged.

## Steps

1. In `components/dashboard/health-chart.tsx`, add
   `isAnimationActive={false}` to the sole `Tooltip`.
2. In `components/dashboard/blood-pressure-chart.tsx`, add
   `isAnimationActive={false}` to the sole `Tooltip`.
3. Extend `components/dashboard/health-chart.test.tsx` and
   `components/dashboard/blood-pressure-chart.test.tsx` only if a small
   Recharts mock can assert the tooltip prop without replacing chart behavior.
   Do not add a brittle source-text test. The mechanical source scan and
   browser check below are required even if no focused unit assertion is
   practical.

## Boundaries

- Do NOT alter line, dot, cursor, axis, tooltip-content, or chart data props.
- Do NOT animate opacity as a substitute.
- Do NOT change `TrendPanel`; it does not render a `Tooltip`.
- Do NOT add a dependency.
- If either tooltip is no longer at the cited component after earlier plans,
  locate that component's one Recharts `Tooltip` and apply the same explicit
  prop. Otherwise, if the chart architecture has changed, STOP and report the
  drift.

## Verification

- **Mechanical**:
  - Run `rg -n -U '<Tooltip[\s\S]{0,180}isAnimationActive=\{false\}' components/dashboard`.
    It must find the tooltip in both chart components.
  - Run `bun run check`.
  - Run `bun run check:full`.
- **Feel check**:
  - Open the public dashboard with health data at desktop width.
  - Move the pointer rapidly across several points in both a single-metric
    chart and the blood-pressure chart.
  - Confirm the tooltip tracks the active coordinate without trailing behind.
  - In DevTools, inspect `.recharts-tooltip-wrapper`; its computed
    `transition` must be `none` while active.
  - Toggle `prefers-reduced-motion: reduce` and confirm behavior is identical.
- **Done when**: every plotted line and every chart tooltip has animation
  disabled, rapid pointer sweeps have no trailing tooltip, and the full
  validation suite passes.
