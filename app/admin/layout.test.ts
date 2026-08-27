import { describe, expect, it } from "vitest";

import { metadata } from "@/app/admin/layout";

describe("admin metadata", () => {
  it("prevents indexing and following admin pages", () => {
    expect(metadata.robots).toEqual({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });
});
