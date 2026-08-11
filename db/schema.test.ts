import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve("db/migrations/0001_schema.sql"), "utf8");

describe("D1 indexes", () => {
  it.each([
    "idx_readings_date",
    "idx_measurements_reading",
    "idx_measurements_vocabulary",
    "idx_active_supplements_name",
    "idx_supplement_changelog_date",
    "idx_visible_health_config",
    "idx_health_metrics_metric_date",
  ])("keeps the %s access path", (index) => {
    expect(schema).toContain(`CREATE INDEX IF NOT EXISTS ${index}`);
  });
});
