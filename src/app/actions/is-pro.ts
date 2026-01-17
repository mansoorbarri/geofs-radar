"use server";

import { auth } from "@clerk/nextjs/server";
import { convex, api } from "~/server/convex";

export async function isPro() {
  const { userId } = await auth();
  if (!userId) return false;

  return await convex.query(api.users.isPro, { clerkId: userId });
}
