export const jsonResponse = <Body>(body: Body, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

export const requestPath = (input: RequestInfo | URL): string => {
  if (input instanceof URL) return `${input.pathname}${input.search}`;
  if (input instanceof Request) {
    const url = new URL(input.url);
    return `${url.pathname}${url.search}`;
  }
  const url = new URL(String(input), "https://bloodwork.test");
  return `${url.pathname}${url.search}`;
};
