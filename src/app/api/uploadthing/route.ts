import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "~/server/uploadthing";

const handlers = createRouteHandler({
  router: ourFileRouter,
});

export function GET(request: Request) {
  // Cast to any to handle version mismatch between Next.js and uploadthing
  return handlers.GET(request as Parameters<typeof handlers.GET>[0]);
}

export function POST(request: Request) {
  // Cast to any to handle version mismatch between Next.js and uploadthing
  return handlers.POST(request as Parameters<typeof handlers.POST>[0]);
}
