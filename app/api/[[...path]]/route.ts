import { handleApiRequest } from "@/lib/effect/api-server";

const handle = (request: Request) => handleApiRequest(request);

export {
  handle as DELETE,
  handle as GET,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
