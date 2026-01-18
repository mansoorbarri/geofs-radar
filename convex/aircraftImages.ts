import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get approved image for a specific airline + aircraft type
// Accepts either IATA (2-letter) or ICAO (3-letter) code
export const getApprovedImage = query({
  args: {
    airlineCode: v.string(), // Can be IATA or ICAO
    aircraftType: v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.airlineCode.toUpperCase();
    const aircraftType = args.aircraftType.toUpperCase();

    // Try IATA lookup first (2-letter codes)
    let image = await ctx.db
      .query("aircraftImages")
      .withIndex("by_iata_aircraft_approved", (q) =>
        q
          .eq("airlineIata", code)
          .eq("aircraftType", aircraftType)
          .eq("isApproved", true)
      )
      .first();

    // If not found, try ICAO lookup (3-letter codes)
    if (!image) {
      image = await ctx.db
        .query("aircraftImages")
        .withIndex("by_icao_aircraft_approved", (q) =>
          q
            .eq("airlineIcao", code)
            .eq("aircraftType", aircraftType)
            .eq("isApproved", true)
        )
        .first();
    }

    if (!image) return null;

    return {
      id: image._id,
      airlineIata: image.airlineIata ?? null,
      airlineIcao: image.airlineIcao ?? null,
      aircraftType: image.aircraftType,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey ?? null,
      photographer: image.photographer ?? null,
      isApproved: image.isApproved,
      uploadedBy: image.uploadedBy,
      approvedBy: image.approvedBy ?? null,
      approvedAt: image.approvedAt ?? null,
      createdAt: image._creationTime,
      updatedAt: image._creationTime,
    };
  },
});

// Get all approved images
export const getApproved = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db
      .query("aircraftImages")
      .withIndex("by_isApproved", (q) => q.eq("isApproved", true))
      .collect();

    // Sort by airline code (prefer IATA, fallback to ICAO) then aircraft type
    return images
      .sort((a, b) => {
        const aCode = a.airlineIata ?? a.airlineIcao ?? "";
        const bCode = b.airlineIata ?? b.airlineIcao ?? "";
        const airlineCompare = aCode.localeCompare(bCode);
        if (airlineCompare !== 0) return airlineCompare;
        return a.aircraftType.localeCompare(b.aircraftType);
      })
      .map((image) => ({
        id: image._id,
        airlineIata: image.airlineIata ?? null,
        airlineIcao: image.airlineIcao ?? null,
        aircraftType: image.aircraftType,
        imageUrl: image.imageUrl,
        imageKey: image.imageKey ?? null,
        photographer: image.photographer ?? null,
        isApproved: image.isApproved,
        uploadedBy: image.uploadedBy,
        approvedBy: image.approvedBy ?? null,
        approvedAt: image.approvedAt ?? null,
        createdAt: image._creationTime,
        updatedAt: image._creationTime,
      }));
  },
});

// Get pending images (PRO only - authorization handled in server action)
export const getPending = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db
      .query("aircraftImages")
      .withIndex("by_isApproved", (q) => q.eq("isApproved", false))
      .order("desc")
      .collect();

    return images.map((image) => ({
      id: image._id,
      airlineIata: image.airlineIata ?? null,
      airlineIcao: image.airlineIcao ?? null,
      aircraftType: image.aircraftType,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey ?? null,
      photographer: image.photographer ?? null,
      isApproved: image.isApproved,
      uploadedBy: image.uploadedBy,
      approvedBy: image.approvedBy ?? null,
      approvedAt: image.approvedAt ?? null,
      createdAt: image._creationTime,
      updatedAt: image._creationTime,
    }));
  },
});

// Get all images (PRO only)
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const images = await ctx.db.query("aircraftImages").collect();

    // Sort: pending first (isApproved: false), then by createdAt descending
    return images
      .sort((a, b) => {
        // Pending first
        if (a.isApproved !== b.isApproved) {
          return a.isApproved ? 1 : -1;
        }
        // Then by creation time descending
        return b._creationTime - a._creationTime;
      })
      .map((image) => ({
        id: image._id,
        airlineIata: image.airlineIata ?? null,
        airlineIcao: image.airlineIcao ?? null,
        aircraftType: image.aircraftType,
        imageUrl: image.imageUrl,
        imageKey: image.imageKey ?? null,
        photographer: image.photographer ?? null,
        isApproved: image.isApproved,
        uploadedBy: image.uploadedBy,
        approvedBy: image.approvedBy ?? null,
        approvedAt: image.approvedAt ?? null,
        createdAt: image._creationTime,
        updatedAt: image._creationTime,
      }));
  },
});

// Get image by ID
export const getById = query({
  args: { id: v.id("aircraftImages") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.id);
    if (!image) return null;

    return {
      id: image._id,
      airlineIata: image.airlineIata ?? null,
      airlineIcao: image.airlineIcao ?? null,
      aircraftType: image.aircraftType,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey ?? null,
      photographer: image.photographer ?? null,
      isApproved: image.isApproved,
      uploadedBy: image.uploadedBy,
      approvedBy: image.approvedBy ?? null,
      approvedAt: image.approvedAt ?? null,
      createdAt: image._creationTime,
      updatedAt: image._creationTime,
    };
  },
});

// Check if approved image exists for airline + aircraft
export const checkApprovedExists = query({
  args: {
    airlineIata: v.optional(v.string()),
    airlineIcao: v.optional(v.string()),
    aircraftType: v.string(),
  },
  handler: async (ctx, args) => {
    const aircraftType = args.aircraftType.toUpperCase();

    // Check by IATA if provided
    if (args.airlineIata) {
      const iataImage = await ctx.db
        .query("aircraftImages")
        .withIndex("by_iata_aircraft_approved", (q) =>
          q
            .eq("airlineIata", args.airlineIata!.toUpperCase())
            .eq("aircraftType", aircraftType)
            .eq("isApproved", true)
        )
        .first();
      if (iataImage) return true;
    }

    // Check by ICAO if provided
    if (args.airlineIcao) {
      const icaoImage = await ctx.db
        .query("aircraftImages")
        .withIndex("by_icao_aircraft_approved", (q) =>
          q
            .eq("airlineIcao", args.airlineIcao!.toUpperCase())
            .eq("aircraftType", aircraftType)
            .eq("isApproved", true)
        )
        .first();
      if (icaoImage) return true;
    }

    return false;
  },
});

// Check if user has pending image for airline + aircraft
export const checkPendingByUser = query({
  args: {
    airlineIata: v.optional(v.string()),
    airlineIcao: v.optional(v.string()),
    aircraftType: v.string(),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const aircraftType = args.aircraftType.toUpperCase();
    const iata = args.airlineIata?.toUpperCase();
    const icao = args.airlineIcao?.toUpperCase();

    // Find pending images by this user for this combo
    const images = await ctx.db
      .query("aircraftImages")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", args.uploadedBy))
      .filter((q) =>
        q.and(
          q.eq(q.field("aircraftType"), aircraftType),
          q.eq(q.field("isApproved"), false),
          // Match if either IATA or ICAO matches (when provided)
          q.or(
            iata ? q.eq(q.field("airlineIata"), iata) : q.eq(true, false),
            icao ? q.eq(q.field("airlineIcao"), icao) : q.eq(true, false)
          )
        )
      )
      .first();

    return images !== null;
  },
});

// Create aircraft image
export const create = mutation({
  args: {
    airlineIata: v.optional(v.string()),
    airlineIcao: v.optional(v.string()),
    aircraftType: v.string(),
    imageUrl: v.string(),
    imageKey: v.optional(v.string()),
    photographer: v.optional(v.string()),
    uploadedBy: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("aircraftImages", {
      airlineIata: args.airlineIata?.toUpperCase(),
      airlineIcao: args.airlineIcao?.toUpperCase(),
      aircraftType: args.aircraftType.toUpperCase(),
      imageUrl: args.imageUrl,
      imageKey: args.imageKey,
      photographer: args.photographer,
      isApproved: false,
      uploadedBy: args.uploadedBy,
    });

    const image = await ctx.db.get(id);
    if (!image) return null;

    return {
      id: image._id,
      airlineIata: image.airlineIata ?? null,
      airlineIcao: image.airlineIcao ?? null,
      aircraftType: image.aircraftType,
      imageUrl: image.imageUrl,
      imageKey: image.imageKey ?? null,
      photographer: image.photographer ?? null,
      isApproved: image.isApproved,
      uploadedBy: image.uploadedBy,
      approvedBy: image.approvedBy ?? null,
      approvedAt: image.approvedAt ?? null,
      createdAt: image._creationTime,
      updatedAt: image._creationTime,
    };
  },
});

// Approve aircraft image
export const approve = mutation({
  args: {
    id: v.id("aircraftImages"),
    approvedBy: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isApproved: true,
      approvedBy: args.approvedBy,
      approvedAt: Date.now(),
    });
  },
});

// Delete aircraft image
export const remove = mutation({
  args: { id: v.id("aircraftImages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Find existing approved image for airline + aircraft (to delete when approving new one)
export const findExistingApproved = query({
  args: {
    airlineIata: v.optional(v.string()),
    airlineIcao: v.optional(v.string()),
    aircraftType: v.string(),
    excludeId: v.optional(v.id("aircraftImages")),
  },
  handler: async (ctx, args) => {
    const aircraftType = args.aircraftType.toUpperCase();
    let image = null;

    // Check by IATA if provided
    if (args.airlineIata) {
      image = await ctx.db
        .query("aircraftImages")
        .withIndex("by_iata_aircraft_approved", (q) =>
          q
            .eq("airlineIata", args.airlineIata!.toUpperCase())
            .eq("aircraftType", aircraftType)
            .eq("isApproved", true)
        )
        .first();
    }

    // If not found, check by ICAO
    if (!image && args.airlineIcao) {
      image = await ctx.db
        .query("aircraftImages")
        .withIndex("by_icao_aircraft_approved", (q) =>
          q
            .eq("airlineIcao", args.airlineIcao!.toUpperCase())
            .eq("aircraftType", aircraftType)
            .eq("isApproved", true)
        )
        .first();
    }

    if (!image) return null;
    if (args.excludeId && image._id === args.excludeId) return null;

    return {
      id: image._id,
      imageKey: image.imageKey ?? null,
    };
  },
});
