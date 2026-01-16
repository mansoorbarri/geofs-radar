"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "~/server/db";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

export interface AircraftImage {
  id: string;
  airlineIata: string;
  aircraftType: string;
  imageUrl: string;
  imageKey: string | null;
  photographer: string | null;
  isApproved: boolean;
  uploadedBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

async function isPro(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { role: true },
  });

  return user?.role === "PRO";
}

async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

// Get approved image for display (used by the hook)
export async function getAircraftImage(
  airlineIata: string,
  aircraftType: string
): Promise<AircraftImage | null> {
  try {
    const image = await db.aircraftImage.findFirst({
      where: {
        airlineIata: airlineIata.toUpperCase(),
        aircraftType: aircraftType.toUpperCase(),
        isApproved: true,
      },
    });
    return image;
  } catch (error) {
    console.error("Error fetching aircraft image:", error);
    return null;
  }
}

// Get all approved images (public)
export async function getApprovedAircraftImages(): Promise<AircraftImage[]> {
  try {
    const images = await db.aircraftImage.findMany({
      where: { isApproved: true },
      orderBy: [{ airlineIata: "asc" }, { aircraftType: "asc" }],
    });
    return images;
  } catch (error) {
    console.error("Error fetching approved aircraft images:", error);
    return [];
  }
}

// Get pending images for approval (PRO only)
export async function getPendingAircraftImages(): Promise<AircraftImage[]> {
  const pro = await isPro();
  if (!pro) return [];

  try {
    const images = await db.aircraftImage.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "desc" },
    });
    return images;
  } catch (error) {
    console.error("Error fetching pending aircraft images:", error);
    return [];
  }
}

// Get all images (PRO only - for admin view)
export async function getAllAircraftImages(): Promise<AircraftImage[]> {
  const pro = await isPro();
  if (!pro) return [];

  try {
    const images = await db.aircraftImage.findMany({
      orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    });
    return images;
  } catch (error) {
    console.error("Error fetching aircraft images:", error);
    return [];
  }
}

// Upload/create image (anyone signed in)
export async function createAircraftImage(data: {
  airlineIata: string;
  aircraftType: string;
  imageUrl: string;
  imageKey?: string;
  photographer?: string;
}): Promise<{ success: boolean; error?: string; image?: AircraftImage }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "You must be signed in to upload images" };
  }

  try {
    // Check if an approved image already exists for this combination
    const existingApproved = await db.aircraftImage.findFirst({
      where: {
        airlineIata: data.airlineIata.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        isApproved: true,
      },
    });

    if (existingApproved) {
      return {
        success: false,
        error: "An approved image already exists for this airline + aircraft combination",
      };
    }

    // Check if user already has a pending image for this combination
    const existingPending = await db.aircraftImage.findFirst({
      where: {
        airlineIata: data.airlineIata.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        isApproved: false,
        uploadedBy: userId,
      },
    });

    if (existingPending) {
      return {
        success: false,
        error: "You already have a pending image for this combination",
      };
    }

    const image = await db.aircraftImage.create({
      data: {
        airlineIata: data.airlineIata.toUpperCase(),
        aircraftType: data.aircraftType.toUpperCase(),
        imageUrl: data.imageUrl,
        imageKey: data.imageKey || null,
        photographer: data.photographer || null,
        isApproved: false,
        uploadedBy: userId,
      },
    });

    revalidatePath("/aircraft-images");
    revalidatePath("/admin/aircraft-images");
    return { success: true, image };
  } catch (error: unknown) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      return {
        success: false,
        error: "An image for this combination is already pending review",
      };
    }
    console.error("Error creating aircraft image:", error);
    return { success: false, error: "Failed to upload image" };
  }
}

// Approve image (PRO only)
export async function approveAircraftImage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const pro = await isPro();
  if (!pro) {
    return { success: false, error: "Only PRO users can approve images" };
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Get the image to approve
    const imageToApprove = await db.aircraftImage.findUnique({
      where: { id },
    });

    if (!imageToApprove) {
      return { success: false, error: "Image not found" };
    }

    // Check if there's already an approved image for this combination
    const existingApproved = await db.aircraftImage.findFirst({
      where: {
        airlineIata: imageToApprove.airlineIata,
        aircraftType: imageToApprove.aircraftType,
        isApproved: true,
        id: { not: id },
      },
    });

    // If there's an existing approved image, delete it first
    if (existingApproved) {
      if (existingApproved.imageKey) {
        try {
          await utapi.deleteFiles(existingApproved.imageKey);
        } catch (e) {
          console.error("Failed to delete old image from UploadThing:", e);
        }
      }
      await db.aircraftImage.delete({
        where: { id: existingApproved.id },
      });
    }

    // Approve the new image
    await db.aircraftImage.update({
      where: { id },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/aircraft-images");
    revalidatePath("/admin/aircraft-images");
    return { success: true };
  } catch (error) {
    console.error("Error approving aircraft image:", error);
    return { success: false, error: "Failed to approve image" };
  }
}

// Reject/delete pending image (PRO only)
export async function rejectAircraftImage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const pro = await isPro();
  if (!pro) {
    return { success: false, error: "Only PRO users can reject images" };
  }

  try {
    const image = await db.aircraftImage.findUnique({
      where: { id },
    });

    if (!image) {
      return { success: false, error: "Image not found" };
    }

    // Delete from UploadThing if it has a key
    if (image.imageKey) {
      try {
        await utapi.deleteFiles(image.imageKey);
      } catch (e) {
        console.error("Failed to delete image from UploadThing:", e);
      }
    }

    await db.aircraftImage.delete({
      where: { id },
    });

    revalidatePath("/aircraft-images");
    revalidatePath("/admin/aircraft-images");
    return { success: true };
  } catch (error) {
    console.error("Error rejecting aircraft image:", error);
    return { success: false, error: "Failed to reject image" };
  }
}

// Delete approved image (PRO only)
export async function deleteAircraftImage(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const pro = await isPro();
  if (!pro) {
    return { success: false, error: "Only PRO users can delete images" };
  }

  try {
    const image = await db.aircraftImage.findUnique({
      where: { id },
    });

    if (!image) {
      return { success: false, error: "Image not found" };
    }

    // Delete from UploadThing if it has a key
    if (image.imageKey) {
      try {
        await utapi.deleteFiles(image.imageKey);
      } catch (e) {
        console.error("Failed to delete image from UploadThing:", e);
      }
    }

    await db.aircraftImage.delete({
      where: { id },
    });

    revalidatePath("/aircraft-images");
    revalidatePath("/admin/aircraft-images");
    return { success: true };
  } catch (error) {
    console.error("Error deleting aircraft image:", error);
    return { success: false, error: "Failed to delete image" };
  }
}
