import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { db } from "~/server/db";

const f = createUploadthing();

export const ourFileRouter = {
  airlineLogoUploader: f({ image: { maxFileSize: "512KB", maxFileCount: 1 } })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      
      const user = await db.user.findUnique({ 
        where: { clerkId: userId },
        select: { id: true, role: true, googleId: true } 
      });

      if (user?.role !== "PREMIUM") throw new Error("Premium Required");
      if (!user.googleId) throw new Error("User Google ID not found in database");
      
      // Pass the googleId to the metadata
      return { userId: user.id, googleId: user.googleId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({
        where: { id: metadata.userId },
        data: { airlineLogo: file.url },
      });
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;