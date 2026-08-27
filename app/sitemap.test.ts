import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";

describe("sitemap", () => {
  it("omits lastModified when no stable content revision is available", () => {
    expect(sitemap()).toEqual([
      {
        url: "https://bloodwork.mareknevole.com",
        changeFrequency: "weekly",
        priority: 1,
      },
    ]);
  });
});
