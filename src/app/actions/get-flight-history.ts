"use server";

import { convex, api } from "~/server/convex";

export async function getFlightHistory(googleId: string) {
  if (!googleId) return [];

  const flights = await convex.query(api.flights.getHistoryByGoogleId, {
    googleId,
  });

  return flights.map((flight) => ({
    ...flight,
    startTime: new Date(flight.startTime),
  }));
}
