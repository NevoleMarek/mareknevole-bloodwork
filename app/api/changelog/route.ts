import { provideAppLayer, runRoute } from "@/lib/effect/http";
import {
  deleteChangelogEffect,
  updateChangelogEffect,
} from "@/lib/effect/workflows";

export async function PUT(request: Request) {
  return runRoute(provideAppLayer(updateChangelogEffect(request)));
}

export async function DELETE(request: Request) {
  return runRoute(provideAppLayer(deleteChangelogEffect(request)));
}
