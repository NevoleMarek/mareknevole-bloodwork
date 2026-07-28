import {
  readOpenNextCacheEntries,
  OPENNEXT_TAG_CACHE_SCHEMA,
} from "@/lib/opennext-cache";

const config = {
  accountId: required("OPENNEXT_CACHE_ACCOUNT_ID"),
  databaseId: required("OPENNEXT_CACHE_D1_ID"),
  namespaceId: required("OPENNEXT_CACHE_KV_ID"),
  token: required("CLOUDFLARE_API_TOKEN"),
};
const entries = readOpenNextCacheEntries();

await cloudflare(
  `/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
  "POST",
  { sql: OPENNEXT_TAG_CACHE_SCHEMA },
);

for (const chunk of chunks(entries, 25)) {
  await cloudflare(
    `/accounts/${config.accountId}/storage/kv/namespaces/${config.namespaceId}/bulk`,
    "PUT",
    chunk.map(({ key, value }) => ({ key, value })),
  );
}

console.log(`Seeded ${entries.length} OpenNext KV cache entries.`);

async function cloudflare(path: string, method: string, body: unknown) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    method,
  });
  const result = (await response.json()) as {
    errors?: { message?: string }[];
    success?: boolean;
  };
  if (!response.ok || !result.success) {
    throw new Error(
      result.errors?.map((error) => error.message).join(", ") ??
        response.statusText,
    );
  }
}

function required(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(`${name} is required to seed the OpenNext cache.`);
  return value;
}

function chunks<T>(values: T[], size: number) {
  return Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );
}
