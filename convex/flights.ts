import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get flight history for a user by their Google ID
export const getHistoryByGoogleId = query({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    // First find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();

    if (!user) return [];

    // Get flights for this user, ordered by startTime descending, limit to 5
    const flights = await ctx.db
      .query("flights")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100); // Get more than we need to sort by startTime

    // Sort by startTime descending and take top 5
    return flights
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, 5)
      .map((flight) => ({
        id: flight._id,
        depICAO: flight.depICAO,
        arrICAO: flight.arrICAO,
        startTime: flight.startTime,
        aircraftType: flight.aircraftType,
        routeData: flight.routeData,
      }));
  },
});

// Create a new flight
export const create = mutation({
  args: {
    userId: v.id("users"),
    callsign: v.string(),
    aircraftType: v.string(),
    depICAO: v.optional(v.string()),
    arrICAO: v.optional(v.string()),
    squawk: v.optional(v.string()),
    routeData: v.optional(v.any()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("flights", {
      userId: args.userId,
      callsign: args.callsign,
      aircraftType: args.aircraftType,
      depICAO: args.depICAO,
      arrICAO: args.arrICAO,
      squawk: args.squawk,
      routeData: args.routeData,
      startTime: args.startTime,
      endTime: args.endTime,
    });
  },
});

// Get all flights for a user
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("flights")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Delete all flights for a user (for cascading delete)
export const deleteByUserId = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const flights = await ctx.db
      .query("flights")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    for (const flight of flights) {
      await ctx.db.delete(flight._id);
    }
  },
});
