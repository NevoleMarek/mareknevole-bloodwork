import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = ["0001_schema.sql", "0002_measurement_reading_date.sql"]
  .map((file) => readFileSync(resolve("db/migrations", file), "utf8"))
  .join("\n");

describe("D1 indexes", () => {
  it.each([
    "idx_readings_date",
    "idx_measurements_reading",
    "idx_measurements_vocabulary",
    "idx_measurements_latest",
    "idx_active_supplements_name",
    "idx_supplement_changelog_date",
    "idx_visible_health_config",
    "idx_health_metrics_metric_date",
  ])("keeps the %s access path", (index) => {
    expect(schema).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
  });

  it("backfills measurement dates before indexing them", () => {
    expect(schema).toContain(
      "ALTER TABLE measurements ADD COLUMN reading_date",
    );
    expect(schema).toContain("WHERE readings.id = measurements.reading_id");
  });
});
