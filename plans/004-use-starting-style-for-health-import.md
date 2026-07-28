# 004 — Use starting style for health import

- **Status**: DONE
- **Commit**: 7490320
- **Severity**: LOW
- **Category**: Interruptibility; physicality & origin
- **Estimated scope**: 4 source/test/spec files, about 50 changed lines

## Problem

Health Import creates each entering layer with a manual phase, then relies on
a zero-delay timer to switch it to the stable phase:

```tsx
// components/admin/health-import.tsx:38 — current
setLayers((current) => [
  ...current.map((layer): StateLayer => ({ ...layer, phase: "leaving" })),
  { id, state, phase: "entering" },
]);

settleTimer.current = setTimeout(() => {
  setLayers((current) =>
    current.map((layer) =>
      layer.id === id ? { ...layer, phase: "stable" } : layer,
    ),
  );
});
```

The corresponding CSS is:

```css
/* app/globals.css:367 — current */
.health-import-state[data-phase="entering"],
.health-import-state[data-phase="leaving"] {
  opacity: 0;
  transform: scale(0.985);
}
```

A zero-delay timer normally creates a second style-change event, but that
timing is implementation-sensitive. A cached `idle → uploading → success`
sequence can be batched before paint, causing the new layer to appear without
its intended entrance. The `0.985` origin is also outside the audit's
`0.9–0.97` physical entrance range and can read as an almost pure fade.

## Target

Use `@starting-style`, the repository's existing mount-entrance convention,
for new state layers. Keep only stable and leaving runtime phases:

```ts
type StateLayer = {
  id: number;
  state: ImportState;
  phase: "stable" | "leaving";
};
```

Create the next layer as stable:

```tsx
setLayers((current) => [
  ...current.map((layer): StateLayer => ({ ...layer, phase: "leaving" })),
  { id, state, phase: "stable" },
]);
```

Remove `settleTimer` completely. Define the lifecycle value once:

```ts
const STATE_TRANSITION_MS = 180;
```

Use it for stale-layer removal. In CSS:

```css
.health-import-state[data-phase="leaving"] {
  pointer-events: none;
  opacity: 0;
  transform: scale(0.97);
  transition-duration: var(--duration-control);
}

@starting-style {
  .health-import-state {
    opacity: 0;
    transform: scale(0.97);
  }
}
```

The new layer enters over the base `var(--duration-state)` (`180ms`); the old
layer exits over `var(--duration-control)` (`160ms`). Both use the existing
strong ease-out. Plan 002's reduced-motion reset must remain authoritative,
with this added to its nested starting style:

```css
@starting-style {
  .health-import-state {
    opacity: 0;
    transform: none !important;
  }
}
```

## Repo conventions to follow

- `app/globals.css:325` already uses `@starting-style` for wizard shells,
  editor panels, and PDF preview.
- Keep the fixed `10rem` grid region; it prevents layout movement during the
  state swap.
- Keep stale layers `aria-hidden`, pointer-inert, and removed after `180ms`.
- Plans 002 and 003 establish the reduced-motion specificity fix and duration
  variables used here.

## Steps

1. In `components/admin/health-import.tsx`, narrow `StateLayer["phase"]` to
   `"stable" | "leaving"`.
2. Add `const STATE_TRANSITION_MS = 180` beside the state types.
3. Remove `settleTimer`, its two clear calls, and its zero-delay callback.
4. Insert each new layer with `phase: "stable"` and retain the existing
   outgoing-layer mapping to `"leaving"`.
5. Use `STATE_TRANSITION_MS` for the removal timer. Keep the three-second
   success dwell separate.
6. In `app/globals.css`, remove the entering-phase selector, set the leaving
   origin to `scale(0.97)`, and add `.health-import-state` to the existing
   top-level `@starting-style` block with `opacity: 0` and `scale(0.97)`.
7. Add the reduced-motion starting style shown in Target to the nested
   `@starting-style` block.
8. In `components/admin/health-import.test.tsx`, assert that the active success
   layer is immediately `data-phase="stable"` before advancing timers. Keep
   the existing assertion that only one stable layer remains after `180ms`.
   Update cleanup wording only if it still mentions the removed settle timer.
9. Update `specs/style.md` to document that health-import layers use
   `@starting-style`, enter from `scale(0.97)`, and retain an interruptible
   transition-based exit.

## Boundaries

- Do NOT remove the layered crossfade or fixed-height region.
- Do NOT add `requestAnimationFrame`, forced layout reads, keyframes, or a
  motion dependency.
- Do NOT add blur unless a slow-motion browser check proves text
  double-exposure remains objectionable.
- Do NOT change import fetch, success dwell, retry, drag, or accessibility
  behavior.
- Execute after plans 002 and 003. If duration tokens or the authoritative
  reduced-motion reset are absent, STOP and complete those plans first.

## Verification

- **Mechanical**:
  - Run `rg -n 'settleTimer|phase: "entering"|data-phase="entering"' components/admin/health-import.tsx app/globals.css`.
    It must return no matches.
  - Run `bun run check`.
  - Run `bun run check:full`.
- **Feel check**:
  - In DevTools at 10% playback, import once with a delayed response and once
    with an immediately resolved mocked response.
  - Confirm every new idle/uploading/success/error layer starts at
    `opacity: 0; scale(0.97)` and settles smoothly.
  - Trigger another state before the first transition ends. The outgoing
    layer must retarget from its current value, the latest layer must enter
    once, and no stale layer may remain after `180ms`.
  - Confirm inactive layers cannot receive pointer or keyboard interaction and
    are hidden from the accessibility tree.
  - Under reduced motion, the same swaps must use `80ms` opacity only and
    computed `transform: none`.
- **Done when**: no zero-delay settle timer remains, fast and slow responses
  both show one reliable transition, scale starts at `0.97`, reduced motion is
  transform-free, and all tests pass.
