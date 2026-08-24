import * as Effect from "effect/Effect";

import { RequestDecodeError } from "@/lib/effect/errors";
import { provideAppLayer, runRoute } from "@/lib/effect/http";
import { ProviderWorkflows } from "@/lib/effect/services";

const readPdf = (request: Request) =>
  Effect.tryPromise({
    try: () => request.formData(),
    catch: () =>
      new RequestDecodeError({
        operation: "extract.form",
        message: "Invalid multipart body",
      }),
  }).pipe(
    Effect.flatMap((formData) => {
      const file = formData.get("pdf");
      return file instanceof File
        ? Effect.succeed(file)
        : Effect.fail(
            new RequestDecodeError({
              operation: "extract.pdf",
              message: "No PDF file provided",
            }),
          );
    }),
  );

export async function POST(request: Request) {
  return runRoute(
    provideAppLayer(
      Effect.gen(function* () {
        const file = yield* readPdf(request);
        const workflows = yield* ProviderWorkflows;
        return yield* workflows.extract(file);
      }),
    ),
  );
}
