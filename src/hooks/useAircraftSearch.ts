// hooks/useAircraftSearch.ts
import { useState, useEffect, useCallback } from "react";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { airlineCodeFromFlightNo, getSizeCategoryFor } from "../../types/flight";

interface Airport {
  name: string;
  lat: number;
  lon: number;
  icao: string;
}

export const useAircraftSearch = (
  aircrafts: PositionUpdate[],
  airports: Airport[],
) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    (PositionUpdate | Airport)[]
  >([]);

  const performSearch = useCallback(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const results: (PositionUpdate | Airport)[] = [];

    aircrafts.forEach((ac) => {
      if (
        ac.callsign?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ac.flightNo?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ac.departure?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ac.arrival?.toLowerCase().includes(lowerCaseSearchTerm) ||
        ac.squawk?.toLowerCase().includes(lowerCaseSearchTerm)
      ) {
        results.push(ac);
      }
      const airline = airlineCodeFromFlightNo(ac.flightNo)?.toLowerCase();
      if (airline && airline.includes(lowerCaseSearchTerm)) {
        results.push(ac);
      }
      const route = `${(ac.departure || "").toLowerCase()}-${(ac.arrival || "").toLowerCase()}`;
      if (route.includes(lowerCaseSearchTerm)) {
        results.push(ac);
      }
      if (lowerCaseSearchTerm.startsWith("size:")) {
        const want = lowerCaseSearchTerm.replace("size:", "");
        if (getSizeCategoryFor(ac.type || "").includes(want)) {
          results.push(ac);
        }
      }
    });

    airports.forEach((airport) => {
      if (
        airport.icao.toLowerCase().includes(lowerCaseSearchTerm) ||
        airport.name.toLowerCase().includes(lowerCaseSearchTerm)
      ) {
        results.push(airport);
      }
    });

    setSearchResults(results);
  }, [searchTerm, aircrafts, airports]);

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch();
    }, 300); // Debounce search

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, performSearch]);

  return { searchTerm, setSearchTerm, searchResults };
};
