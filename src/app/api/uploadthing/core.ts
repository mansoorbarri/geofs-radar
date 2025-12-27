import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";
import { z } from "zod";
import { db } from "~/server/db";

const f = createUploadthing();
const utapi = new UTApi();

export const ourFileRouter = {
  airlineLogoUploader: f({
    "image/png": {
      maxFileSize: "512KB",
      maxFileCount: 1,
    },
  })
    .input(
      z.object({
        customId: z.string(),
      }),
    )
    .middleware(async ({ input }) => {
      const { userId: clerkId } = await auth();
      if (!clerkId) {
        throw new Error("Unauthorized");
      }

      const user = await db.user.findUnique({
        where: { clerkId },
        select: {
          id: true,
          role: true,
          googleId: true,
          airlineLogo: true,
        },
      });

      if (user?.role !== "PREMIUM") {
        throw new Error("Premium Required");
      }

      if (!user?.googleId) {
        throw new Error("Google ID missing");
      }

      if (input.customId !== user.googleId) {
        throw new Error("Invalid customId");
      }

      return {
        userId: user.id,
        customId: input.customId,
        oldLogoUrl: user.airlineLogo,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const key = metadata.oldLogoUrl?.split("/").pop();
      if (key) {
        await utapi.deleteFiles([key]).catch(() => null);
      }

      await db.user.update({
        where: { id: metadata.userId },
        data: {
          airlineLogo: file.ufsUrl,
        },
      });

      return {
        uploadedBy: metadata.userId,
        googleId: metadata.customId,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
