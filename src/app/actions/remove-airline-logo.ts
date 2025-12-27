"use server";

import { auth } from "@clerk/nextjs/server";
import { UTApi } from "uploadthing/server";
import { db } from "~/server/db";

const utapi = new UTApi();

export async function removeAirlineLogo() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      airlineLogo: true,
    },
  });

  const key = user?.airlineLogo?.split("/").pop();
  if (key) {
    await utapi.deleteFiles([key]).catch(() => null);
  }

  if (user?.id) {
    await db.user.update({
      where: { id: user.id },
      data: {
        airlineLogo: null,
      },
    });
  }
}