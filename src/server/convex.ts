import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

// Server-side Convex client for use in server actions and API routes
export const convex = new ConvexHttpClient(convexUrl);

// Export the api for typed queries/mutations
export { api };
