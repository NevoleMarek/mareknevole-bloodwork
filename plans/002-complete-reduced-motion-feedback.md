# 002 — Complete reduced-motion feedback

- **Status**: TODO
- **Commit**: 7490320
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 2 source files, about 35 changed lines

## Problem

The reduced-motion block removes most transforms, but three paths escape or
lose useful feedback.

The dashboard underline is not included in the reduced-motion selectors:

```tsx
// components/dashboard/section-nav.tsx:78 — current
<span
  aria-hidden="true"
  className={`absolute right-2 bottom-1.5 left-2 h-0.5 origin-left rounded-full bg-emerald-700 transition-transform duration-[160ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-3 sm:left-3 ${
    active === id ? "scale-x-100" : "scale-x-0"
  }`}
/>
```

Two state selectors are more specific than the later one-class transform
reset:

```css
/* app/globals.css:367 — current */
.health-import-state[data-phase="entering"],
.health-import-state[data-phase="leaving"] {
  opacity: 0;
  transform: scale(0.985);
}

/* app/globals.css:399 — current */
.copy-markdown-button[data-copied="true"] .copy-label-default {
  opacity: 0;
  transform: translateY(-3px);
}

/* app/globals.css:621 — current reduced-motion reset */
.health-import-state,
.copy-label {
  transform: none;
}
```

As a result, health-import and copy states still change transform under
reduced motion. Because `transition-property` excludes transform, they snap
rather than move smoothly.

Finally, reduced motion removes the only authored press cue while native tap
highlighting is suppressed:

```css
/* app/globals.css:80,93,614 — current */
button,
[role="button"] {
  -webkit-tap-highlight-color: transparent;
}

button:active:not(:disabled),
nav a:active,
label[class*="cursor-pointer"]:active {
  transform: scale(0.98);
}
```

Reduced motion should remove displacement while retaining short opacity or
color feedback.

## Target

Use opacity, not scale, for the section indicator under reduced motion. Give
the span a stable hook and semantic state:

```tsx
<span
  aria-hidden="true"
  data-active={active === id}
  className={`section-nav-indicator ... ${
    active === id ? "scale-x-100" : "scale-x-0"
  }`}
/>
```

Within `@media (prefers-reduced-motion: reduce)`:

```css
.section-nav-indicator {
  opacity: 0;
  transform: none !important;
}

.section-nav-indicator[data-active="true"] {
  opacity: 1;
}
```

Make the existing grouped transform reset authoritative:

```css
button:active:not(:disabled),
nav a:active,
a:is(.button-primary, .button-secondary, .button-quiet):active,
label[class*="cursor-pointer"]:active,
.interactive-card:hover,
.section-nav-indicator,
.admin-state-shell,
.admin-state-panel,
.admin-pdf-preview,
.health-import-state,
.file-drop-shell,
.file-drop-shell[data-drag-active="true"],
.file-drop-glyph,
.file-drop-shell[data-drag-active="true"] .file-drop-glyph,
.copy-label {
  transform: none !important;
}
```

Retain an exact `opacity: 0.82` press cue for transform-free mode:

```css
button:active:not(:disabled),
nav a:active,
a:is(.button-primary, .button-secondary, .button-quiet):active,
label[class*="cursor-pointer"]:active {
  opacity: 0.82;
}
```

The existing reduced-motion `80ms` transition duration remains in force.

## Repo conventions to follow

- The reduced-motion block at `app/globals.css:592` already keeps color,
  background, border, shadow, and opacity for `80ms`.
- `file-drop-glyph` already uses opacity as its non-spatial cue.
- `components/dashboard/section-nav.tsx:80` already treats the underline as
  decorative with `aria-hidden="true"`; keep that behavior.
- Preserve the normal-motion `origin-left` scale transition. This plan changes
  only the reduced-motion representation.

## Steps

1. In `components/dashboard/section-nav.tsx`, add the
   `section-nav-indicator` class and `data-active={active === id}` to the
   underline span. Keep the existing scale classes for normal motion.
2. In the first selector group inside
   `@media (prefers-reduced-motion: reduce)` in `app/globals.css`, include
   `.section-nav-indicator` so its reduced transition is opacity-only for
   `80ms`.
3. Add `!important` to `transform: none` in the existing grouped reset and
   include `.section-nav-indicator`. This must override the higher-specificity
   health-import and copy state rules.
4. Add the two reduced-motion opacity rules from the Target section.
5. Include button-styled anchors in both the transform-free and opacity press
   selectors. They exist today at `app/page.tsx:100` and
   `components/admin/upload-wizard.tsx:418`.
6. If a focused `SectionNav` test is added, assert one
   `data-active="true"` indicator and three `data-active="false"` indicators.
   Do not test CSS by parsing stylesheet text.

## Boundaries

- Do NOT disable all transitions.
- Do NOT remove the normal-motion underline scale.
- Do NOT change smooth scrolling; CSS and JavaScript already honor reduced
  motion.
- Do NOT change state timers or health-import markup in this plan.
- Do NOT add a dependency.
- This plan should run before plans 003 and 004. Those plans extend the same
  selectors and tokens.

## Verification

- **Mechanical**:
  - Run `bun run check`.
  - Run `bun run check:full`.
  - Run
    `rg -n 'section-nav-indicator|transform: none !important|opacity: 0.82' app/globals.css components/dashboard/section-nav.tsx`.
- **Feel check**:
  - Emulate `prefers-reduced-motion: reduce` in Chromium.
  - Click and manually scroll between all dashboard sections. The active
    underline must crossfade for `80ms`; it must not grow or collapse.
  - Trigger Health Import transitions and Copy as Markdown. In computed
    styles, every participating layer must report `transform: none`; opacity
    must still change.
  - Press native buttons, sticky-nav links, both button-styled anchors, and a
    file-drop label. They must dim to `0.82` without moving, then return
    cleanly.
  - Repeat on a coarse/touch emulation and confirm no sticky hover state.
- **Done when**: reduced motion contains no authored translation or scaling,
  active state remains obvious through opacity, and all checks pass.
