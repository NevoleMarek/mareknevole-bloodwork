const quickChecks = [
  "Run bun run check during everyday development.",
  "Use bun run check:full before larger milestones.",
  "Keep specs and agent guidance aligned with code changes.",
];

const starterTracks = [
  {
    title: "Build fast",
    description:
      "Next.js, React, TypeScript, and Bun keep the local feedback loop quick.",
  },
  {
    title: "Stay consistent",
    description:
      "ESLint, Prettier, and typed paths keep code quality high without much ceremony.",
  },
  {
    title: "Test the UI",
    description:
      "Vitest and Testing Library are ready for components and small interaction checks.",
  },
];

export function HomeDashboard() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 py-12 sm:px-10 lg:px-12">
      <section className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-zinc-300 backdrop-blur">
            Local-first starter
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
              Bloodwork is ready for rapid local development.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-300">
              This scaffold gives you a polished Next.js foundation with fast
              verification, modern styling, and a test setup that stays out of
              the way while you build.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-cyan-100">
              Next.js 16 + React 19
            </div>
            <div className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-4 py-2 text-fuchsia-100">
              Bun-managed workflow
            </div>
            <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-emerald-100">
              Fast checks by default
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <p className="text-sm font-medium tracking-[0.2em] text-zinc-400 uppercase">
            Suggested loop
          </p>
          <ul className="mt-4 space-y-4 text-sm leading-7 text-zinc-200">
            {quickChecks.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {starterTracks.map((track) => (
          <article
            key={track.title}
            className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6"
          >
            <p className="text-sm font-medium text-cyan-200">{track.title}</p>
            <p className="mt-3 text-base leading-7 text-zinc-300">
              {track.description}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
