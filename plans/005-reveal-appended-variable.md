# 005 — Reveal the appended variable

- **Status**: DONE
- **Commit**: 7490320
- **Severity**: LOW
- **Category**: Missed opportunities
- **Estimated scope**: 4 source/test/spec files, about 55 changed lines

## Problem

The rare “Add variable” action appends a blank row at the bottom of a
potentially long extraction table with no visual acknowledgment:

```tsx
// components/admin/step-review-extraction.tsx:37 — current
function addVariable() {
  onVariablesChange([...variables, { label: "", value: 0, unit: "" }]);
}
```

```tsx
// components/admin/step-review-extraction.tsx:76 — current
{variables.map((v, i) => (
  <tr key={i} className="border-t border-zinc-900/8">
```

The table height changes instantly, and the new blank fields can be missed
below the button's previous viewport position. This is a rare, explicit state
change where a short reveal improves causal clarity.

## Target

Track only the latest appended index:

```tsx
const [latestAddedIndex, setLatestAddedIndex] = useState<number | null>(null);

function deleteVariable(index: number) {
  setLatestAddedIndex(null);
  onVariablesChange(variables.filter((_, i) => i !== index));
}

function addVariable() {
  setLatestAddedIndex(variables.length);
  onVariablesChange([...variables, { label: "", value: 0, unit: "" }]);
}
```

Mark only that newly mounted row:

```tsx
<tr
  key={i}
  data-new={latestAddedIndex === i || undefined}
  className="extraction-variable-row border-t border-zinc-900/8"
>
```

Use a transition, not keyframes:

```css
.extraction-variable-row[data-new="true"] {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity var(--duration-control) var(--ease-out-strong),
    transform var(--duration-control) var(--ease-out-strong);
}

@starting-style {
  .extraction-variable-row[data-new="true"] {
    opacity: 0;
    transform: translateY(4px);
  }
}
```

Under reduced motion, preserve an `80ms` opacity entrance and force
`transform: none !important`, including inside the nested
`@starting-style`.

## Repo conventions to follow

- Use the duration tokens from plan 003:
  `var(--duration-feedback)` for reduced motion and
  `var(--duration-control)` for the normal reveal.
- Use the existing `--ease-out-strong` curve.
- The four-pixel offset matches existing admin state entrances.
- The row remains immediately interactive; the transition must never delay
  focus, input, or pointer events.

## Steps

1. Import `useState` in
   `components/admin/step-review-extraction.tsx`.
2. Add `latestAddedIndex` state exactly as shown in Target.
3. Set the index before appending and clear it before any row deletion.
   Do not add a timer; leaving `data-new` in place does not replay
   `@starting-style` on an already mounted row.
4. Add the `data-new` attribute and `extraction-variable-row` class to each
   mapped row.
5. Add the normal and starting styles from Target to `app/globals.css`.
6. Add the row selector to the existing reduced-motion transition and
   transform-reset groups. Add this nested starting style:

   ```css
   @starting-style {
     .extraction-variable-row[data-new="true"] {
       opacity: 0;
       transform: none !important;
     }
   }
   ```

7. Add `components/admin/step-review-extraction.test.tsx` with a small
   controlled harness:
   - render one existing variable;
   - click “Add variable”;
   - assert a second row exists and has `data-new="true"`;
   - assert the new row's label, value, and unit inputs are immediately
     enabled and editable;
   - delete a row and assert no remaining row has `data-new="true"`.
8. Add one sentence to the Motion section of `specs/style.md`: appended
   extraction rows enter over `160ms` from a four-pixel offset; reduced motion
   keeps only the `80ms` opacity cue.

## Boundaries

- Do NOT animate row deletion, destructive confirmation, table height, or
  layout properties.
- Do NOT animate all extracted rows when the wizard step mounts.
- Do NOT auto-focus or scroll the new row in this plan.
- Do NOT use an array index for any new persisted identity beyond the
  component's existing `key={i}` behavior.
- Do NOT add a timer, keyframe, animation library, or dependency.
- Execute after plan 003. If the duration tokens are absent, STOP and complete
  plan 003 first.

## Verification

- **Mechanical**:
  - Run the focused test:
    `bun run test components/admin/step-review-extraction.test.tsx`.
  - Run `bun run check`.
  - Run `bun run check:full`.
- **Feel check**:
  - Open the extraction review with enough rows to fill most of the viewport.
  - Slow animations to 10%, click “Add variable,” and confirm only the new
    last row rises four pixels while fading in over `160ms`.
  - Type in the row during the transition; interaction must be immediate.
  - Add several rows rapidly. Each newly mounted row should enter once without
    restarting earlier rows.
  - Delete a row and confirm removal remains immediate.
  - Under reduced motion, confirm the new row fades for `80ms` with computed
    `transform: none`.
- **Done when**: the appended row is unmistakably connected to the button
  action, no existing or deleted row animates, reduced motion is opacity-only,
  and all tests pass.
