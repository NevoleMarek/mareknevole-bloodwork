export async function buildProductionOpenNext(
  run: (script: "build:worker" | "seed:opennext-cache") => Promise<number>,
) {
  const buildExitCode = await run("build:worker");
  if (buildExitCode !== 0) return buildExitCode;
  return run("seed:opennext-cache");
}
