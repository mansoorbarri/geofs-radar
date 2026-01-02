import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch(
    "https://aviationweather.gov/api/data/airmet?format=geojson",
  );
  const data = await res.json();
  return NextResponse.json(data);
}
