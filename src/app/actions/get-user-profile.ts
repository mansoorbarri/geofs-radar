"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";

export async function getUserProfile() {
  const { userId } = await auth();
  if (!userId) return null;

  return await db.user.findUnique({
    where: { clerkId: userId },
    select: {
      role: true,
      radarKey: true,
    },
  });
}