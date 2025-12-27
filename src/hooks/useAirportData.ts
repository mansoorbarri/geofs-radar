// hooks/useAirportData.ts
import { useState, useEffect, useCallback } from "react";

interface Airport {
  name: string;
  lat: number;
  lon: number;
  icao: string;
  frequencies?: { type: string; frequency: string }[];
}

export const useAirportData = () => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportFetchError, setAirportFetchError] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchAirports = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch from OurAirports public dataset (CSV format)
      const response = await fetch(
        "https://davidmegginson.github.io/ourairports-data/airports.csv",
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const csvText = await response.text();

      // Parse CSV manually (simple parser for this specific format)
      const lines = csvText.split("\n");
      const headers = lines[0]?.split(",") || [];

      // Find column indices
      const icaoIdx = headers.findIndex((h) => h?.includes("ident"));
      const nameIdx = headers.findIndex((h) => h?.includes("name"));
      const latIdx = headers.findIndex((h) => h?.includes("latitude_deg"));
      const lonIdx = headers.findIndex((h) => h?.includes("longitude_deg"));
      const typeIdx = headers.findIndex((h) => h?.includes("type"));

      const airportArray: Airport[] = [];

      // Parse each line (skip header)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line?.trim()) continue;

        // Handle quoted fields in CSV
        const fields: string[] = [];
        let currentField = "";
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            fields.push(currentField);
            currentField = "";
          } else {
            currentField += char;
          }
        }
        fields.push(currentField); // Add last field

        const icao = fields[icaoIdx]?.replace(/"/g, "").trim() || "";
        const name = fields[nameIdx]?.replace(/"/g, "").trim() || "";
        const lat = parseFloat(fields[latIdx]?.replace(/"/g, "").trim() || "0");
        const lon = parseFloat(fields[lonIdx]?.replace(/"/g, "").trim() || "0");
        const type = fields[typeIdx]?.replace(/"/g, "").trim() || "";

        // Only include medium/large airports with valid ICAO codes
        if (
          icao &&
          icao.length >= 3 &&
          !isNaN(lat) &&
          !isNaN(lon) &&
          (type === "large_airport" || type === "medium_airport")
        ) {
          airportArray.push({
            name: name || icao,
            lat,
            lon,
            icao,
          });
        }
      }

      console.log(
        `Loaded ${airportArray.length} airports from OurAirports API`,
      );
      setAirports(airportArray);
      setAirportFetchError(null);
    } catch (e) {
      console.error("Could not load airport data:", e);
      setAirportFetchError("Failed to load airport data from API.");

      // Fallback to empty array
      setAirports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAirports();
  }, [fetchAirports]);

  return { airports, airportFetchError, isLoading };
};
