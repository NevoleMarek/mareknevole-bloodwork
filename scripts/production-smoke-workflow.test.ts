import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("production deployment smoke gate", () => {
  it("runs after Alchemy deploy without receiving production secrets", () => {
    const workflow = readFileSync(
      resolve(process.cwd(), ".github/workflows/deploy-production.yml"),
      "utf8",
    );
    const deployStep = workflow.indexOf("- name: Deploy\n");
    const smokeStep = workflow.indexOf("- name: Smoke test production\n");
    const smokeBlock = workflow.slice(smokeStep);

    expect(deployStep).toBeGreaterThanOrEqual(0);
    expect(smokeStep).toBeGreaterThan(deployStep);
    expect(smokeBlock).toContain("run: bun run smoke:production");
    expect(smokeBlock).toContain(
      "PRODUCTION_URL: https://bloodwork.mareknevole.com",
    );
    expect(smokeBlock).not.toContain("ADMIN_PASSWORD");
    expect(smokeBlock).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(smokeBlock).not.toContain("GEMINI_API_KEY");
  });
});
