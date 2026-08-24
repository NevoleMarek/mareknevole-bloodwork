import { provideAppLayer, runRoute } from "@/lib/effect/http";
import {
  deleteReadingEffect,
  getReadingsEffect,
  saveReadingEffect,
} from "@/lib/effect/workflows";

export async function GET(request: Request) {
  return runRoute(provideAppLayer(getReadingsEffect(request)));
}

export async function DELETE(request: Request) {
  return runRoute(provideAppLayer(deleteReadingEffect(request)));
}

export async function POST(request: Request) {
  return runRoute(provideAppLayer(saveReadingEffect(request)));
}
