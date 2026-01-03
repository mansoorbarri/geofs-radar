import { NextRequest, NextResponse } from "next/server";
import { getAirportChart } from "~/services/airportChartsService";
import { getUserProfile } from "~/app/actions/get-user-profile";
import { hasPRO } from "~/lib/capabilities";

export async function GET(_request: NextRequest, context: any) {
  const { icao } = await context.params;

  const profile = await getUserProfile();

  if (!hasPRO(profile?.role)) {
    return NextResponse.json({ error: "PRO required" }, { status: 403 });
  }

  try {
    const chart = await getAirportChart(icao);
    console.log(chart);
    return NextResponse.json({ chart });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch chart" },
      { status: 500 },
    );
  }
}
