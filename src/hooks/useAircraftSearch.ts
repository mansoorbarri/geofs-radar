// hooks/useAircraftSearch.ts
import { useState, useEffect, useCallback } from "react";
import { type PositionUpdate } from "~/lib/aircraft-store";

interface Airport {
  name: string;
  lat: number;
  lon: number;
  icao: string;
}

export const useAircraftSearch = (
  aircrafts: PositionUpdate[],
  airports: Airport[],
  onSearchStart?: () => void,
) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    (PositionUpdate | Airport)[]
  >([]);

  // Trigger airport fetch when user starts searching
  useEffect(() => {
    if (searchTerm && onSearchStart) {
      onSearchStart();
    }
  }, [searchTerm, onSearchStart]);

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
