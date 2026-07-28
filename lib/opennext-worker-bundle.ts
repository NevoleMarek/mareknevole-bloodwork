export const OPENNEXT_WORKER_MODULE_GLOBS = [
  ".build/durable-objects/bucket-cache-purge.js",
  ".build/durable-objects/queue.js",
  ".build/durable-objects/sharded-tag-cache.js",
  "cloudflare/images.js",
  "cloudflare/init.js",
  "cloudflare/next-env.mjs",
  "cloudflare/skew-protection.js",
  "middleware/handler.mjs",
  "middleware/open-next.config.mjs",
  "server-functions/default/handler.mjs",
];

export const openNextWorkerModuleRules = [
  { globs: OPENNEXT_WORKER_MODULE_GLOBS },
];
