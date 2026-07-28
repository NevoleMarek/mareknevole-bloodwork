# 003 — Unify control motion

- **Status**: DONE
- **Commit**: 7490320
- **Severity**: MEDIUM
- **Category**: Interruptibility; performance; cohesion & tokens
- **Estimated scope**: 7 source/spec files, about 70 changed lines

## Problem

Every native button, navigation link, and cursor-labelled control uses one
symmetric `160ms` transform transition:

```css
/* app/globals.css:85 — current */
button,
nav a,
label[class*="cursor-pointer"] {
  cursor: pointer;
  transform: translateZ(0);
  transition: transform 160ms var(--ease-out-strong);
}

button:active:not(:disabled),
nav a:active,
label[class*="cursor-pointer"]:active {
  transform: scale(0.98);
}
```

This creates four related problems:

1. Press and release both take `160ms`; release should snap back faster.
2. `translateZ(0)` can permanently promote every table action and navigation
   item to a compositor layer, even while idle.
3. Button-styled anchors at `app/page.tsx:100` and
   `components/admin/upload-wizard.tsx:418` are outside `nav`, so they receive
   no press response.
4. The unlayered transition shorthand overrides Tailwind's layered
   `transition-colors` utilities on buttons and nav links. Their authored
   color-state transitions therefore do not run.

The same `80ms`, `160ms`, `180ms`, and easing values are also duplicated
through `app/globals.css` and four Tailwind class strings:

```tsx
// components/dashboard/section-nav.tsx:71 — current
transition-colors duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]
```

Equivalent literals appear in `components/dashboard/health-grid.tsx:54`,
`components/admin/health-visibility.tsx:49`, and `app/admin/layout.tsx:66`.

## Target

Add one duration scale beside the existing curve:

```css
:root {
  --duration-feedback: 80ms;
  --duration-release: 100ms;
  --duration-control: 160ms;
  --duration-state: 180ms;
  --ease-out-strong: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Replace the global control block with:

```css
button,
nav a,
a:is(.button-primary, .button-secondary, .button-quiet),
label[class*="cursor-pointer"] {
  cursor: pointer;
  transition:
    transform var(--duration-release) var(--ease-out-strong),
    color var(--duration-control) var(--ease-out-strong),
    background-color var(--duration-control) var(--ease-out-strong),
    border-color var(--duration-control) var(--ease-out-strong);
}

button:active:not(:disabled),
nav a:active,
a:is(.button-primary, .button-secondary, .button-quiet):active,
label[class*="cursor-pointer"]:active {
  transform: scale(0.98);
  transition-duration: var(--duration-control);
}
```

The pointer-down phase remains the documented `160ms`; release becomes
`100ms`, both inside the audit's `100–160ms` button budget. Do not change the
settled `scale(0.98)` decision.

Move the section indicator's transition to its semantic CSS class:

```css
.section-nav-indicator {
  transition: transform var(--duration-control) var(--ease-out-strong);
}
```

Use the four duration variables throughout authored CSS motion. Remove
redundant transition/duration/easing utilities from controls whose motion is
now supplied by the global rule.

## Repo conventions to follow

- Keep `--ease-out-strong: cubic-bezier(0.16, 1, 0.3, 1)`. It is a documented
  product decision in `specs/style.md`.
- The existing press scale is `0.98`; preserve it.
- Hover movement remains gated by
  `@media (hover: hover) and (pointer: fine)`.
- Plan 002 adds `section-nav-indicator` and the opacity-only reduced-motion
  fallback. Preserve both.

## Steps

1. Add `--duration-feedback`, `--duration-release`,
   `--duration-control`, and `--duration-state` to `:root` in
   `app/globals.css`.
2. Replace the global control and active blocks with the exact Target rules.
   Remove `transform: translateZ(0)`.
3. Add the normal-motion `.section-nav-indicator` rule from Target.
4. Replace authored CSS motion literals:
   - `80ms` with `var(--duration-feedback)`;
   - `160ms` with `var(--duration-control)`;
   - `180ms` with `var(--duration-state)`;
   - keep the new `100ms` only in `--duration-release`.
     Dwell timers in TypeScript are not CSS durations and stay unchanged.
5. Remove redundant
   `transition-colors duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]`
   fragments from:
   - `components/dashboard/section-nav.tsx` control buttons;
   - `components/dashboard/health-grid.tsx` period links;
   - `app/admin/layout.tsx` navigation links.
6. Remove redundant `transition-colors duration-[160ms]` from
   `components/admin/health-visibility.tsx`.
7. Remove
   `transition-transform duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)]`
   from the section indicator in
   `components/dashboard/section-nav.tsx`; its semantic CSS class owns that
   transition.
8. Update the Controls and Motion sections of `specs/style.md` to state:
   pointer-down is `160ms`, release is `100ms`, button-styled anchors share
   the response, and `80/100/160/180ms` values come from shared tokens.

## Boundaries

- Do NOT change `scale(0.98)` to a different value.
- Do NOT add `transition: all`.
- Do NOT transition box shadow in the global control rule.
- Do NOT target `.button-primary` without an element qualifier; the
  “Choose file” label contains a decorative `span.button-primary` that must
  not gain a second nested press scale.
- Do NOT remove the reduced-motion opacity feedback from plan 002.
- Do NOT add a dependency.
- Execute after plan 002. If `section-nav-indicator` is absent, STOP and
  complete plan 002 before this plan.

## Verification

- **Mechanical**:
  - Run
    `rg -n 'translateZ\(0\)|transition-all|cubic-bezier\(0\.16,1,0\.3,1\)|duration-\[160ms\]' app components`.
    It must find no runtime duplicates; the spaced token declaration in CSS
    and prose in `specs/style.md` are expected.
  - Run `bun run check`.
  - Run `bun run check:full`.
- **Feel check**:
  - In DevTools at 10% playback, hold and release a primary button. Computed
    transition duration must be `160ms` while active and `100ms` on release.
  - Rapidly tap the same control. Each transition must retarget from its
    rendered scale without a snap.
  - Repeat on the owner link and Open PDF link; both must now compress once,
    with no nested scaling.
  - Hover primary/secondary buttons and change selected nav/period/visibility
    controls. Color and border changes must take `160ms`.
  - Inspect the Layers panel on an admin table with many actions. Idle buttons
    must not be promoted solely by `translateZ(0)`.
  - Repeat with reduced motion and confirm plan 002's `80ms` opacity-only
    response wins.
- **Done when**: press is `160ms` down and `100ms` up, all button-like
  controls share it, no idle global 3D transform remains, control color
  transitions work, duration literals are consolidated, and checks pass.
