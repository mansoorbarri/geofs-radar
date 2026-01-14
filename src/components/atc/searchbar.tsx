import React from "react";
import { type PositionUpdate } from "~/lib/aircraft-store";

interface Airport {
  name: string;
  lat: number;
  lon: number;
  icao: string;
}

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: (PositionUpdate | Airport)[];
  isMobile: boolean;
  onSelectAircraft: (aircraft: PositionUpdate) => void;
  onSelectAirport: (airport: Airport) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  setSearchTerm,
  searchResults,
  isMobile,
  onSelectAircraft,
  onSelectAirport,
}) => {
  return (
    <div className={`flex flex-col ${isMobile ? "w-full" : "items-start"}`}>
      <input
        type="text"
        placeholder="Search flight or airport..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        autoFocus={isMobile}
        className={`rounded-lg border border-cyan-400/30 bg-black/80 px-4 py-2.5 text-[14px] text-cyan-400 placeholder-cyan-500/50 transition-all duration-200 outline-none ${
          isMobile ? "w-full" : "ml-5 mt-1 w-[280px]"
        } ${
          searchTerm && searchResults.length > 0 ? "mb-2" : ""
        } hover:border-cyan-400/60 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,255,255,0.3)]`}
      />

      {searchTerm && searchResults.length > 0 && (
        <div
          className={`overflow-y-auto rounded-lg border border-cyan-400/20 bg-black/90 ${
            isMobile ? "max-h-[70vh] w-full" : "ml-5 max-h-[300px] w-[280px]"
          }`}
        >
          {searchResults.map((result, index) => (
            <div
              key={
                "callsign" in result
                  ? result.callsign || result.flightNo || `ac-${index}`
                  : `ap-${result.icao}`
              }
              onClick={() => {
                if ("callsign" in result) {
                  onSelectAircraft(result);
                } else {
                  onSelectAirport(result);
                }
                setSearchTerm("");
              }}
              className={`cursor-pointer border-b border-cyan-400/10 px-4 py-3 text-[14px] text-cyan-100 transition-colors duration-150 last:border-b-0 active:bg-cyan-400/20 ${
                isMobile ? "" : "hover:bg-cyan-400/10"
              }`}
            >
              {"callsign" in result ? (
                <>
                  <div className="font-semibold text-cyan-300">
                    {result.callsign || result.flightNo || "N/A"}
                  </div>
                  <div className="mt-1 text-[12px] text-cyan-200/60">
                    {result.type} • {result.departure} → {result.arrival || "UNK"}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-semibold text-cyan-300">
                    {result.icao}
                  </div>
                  <div className="mt-1 text-[12px] text-cyan-200/60">
                    {result.name}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
