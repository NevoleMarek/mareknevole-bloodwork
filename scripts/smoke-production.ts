import {
  ProductionSmokeError,
  runProductionSmoke,
} from "@/lib/production-smoke";

const productionUrl = process.env.PRODUCTION_URL;

if (!productionUrl) {
  console.error("PRODUCTION_URL is required.");
  process.exitCode = 1;
} else {
  runProductionSmoke({ baseUrl: productionUrl })
    .then((summaries) => {
      for (const summary of summaries) {
        console.log(
          `Production smoke passed: ${summary.name} (${summary.attempts} attempt${summary.attempts === 1 ? "" : "s"}).`,
        );
      }
    })
    .catch((error) => {
      if (error instanceof ProductionSmokeError) {
        console.error(error.message);
      } else {
        console.error("Production smoke could not complete.");
      }
      process.exitCode = 1;
    });
}
