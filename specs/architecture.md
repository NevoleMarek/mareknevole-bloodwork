# Architecture

## Current Stack

- Framework: `Next.js` App Router
- UI: `React` with `TypeScript`
- Package manager: `bun`
- Styling: `Tailwind CSS`
- Testing: `Vitest`, `jsdom`, and Testing Library
- Code quality: `ESLint` and `Prettier`

## Project Structure

- `app/`: Next.js routes, layout, and global styles
- `components/`: reusable UI building blocks
- `specs/`: living product and architecture documentation
- `public/`: static assets served by Next.js

## Verification Workflow

- Fast iteration command: `bun run check`
- Full verification command: `bun run check:full`
- Watch mode for tests: `bun run test:watch`

`bun run check` is intended for the everyday inner loop and should stay fast.
`bun run check:full` adds slower milestone validation, including a production build.

## Architectural Constraints

- Keep the project local-only unless the user asks for deployment-oriented changes.
- Prefer simple synchronous UI components when possible to keep unit testing straightforward.
- When architecture or toolchain choices change, update this document in the same task.
