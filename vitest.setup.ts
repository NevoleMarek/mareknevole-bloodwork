import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import "@testing-library/jest-dom/vitest";

afterEach(cleanup);

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
