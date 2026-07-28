import { buildProductionOpenNext } from "@/lib/build-production-opennext";

declare const Bun: {
  spawn(
    command: string[],
    options: { env: NodeJS.ProcessEnv; stderr: "inherit"; stdout: "inherit" },
  ): { exited: Promise<number> };
};

process.exit(
  await buildProductionOpenNext(
    (script) =>
      Bun.spawn([process.execPath, "run", script], {
        env: process.env,
        stderr: "inherit",
        stdout: "inherit",
      }).exited,
  ),
);
