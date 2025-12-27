"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { useMobileDetection } from "~/hooks/useMobileDetection";
import { useAircraftStream } from "~/hooks/useAircraftStream";
import { useAirportData } from "~/hooks/useAirportData";
import { useAircraftSearch } from "~/hooks/useAircraftSearch";
import { ConnectionStatusIndicator } from "~/components/atc/connectionStatusIndicator";
import { SearchBar } from "~/components/atc/searchbar";
import { Sidebar } from "~/components/atc/sidebar";
import Loading from "~/components/loading";
import { useUtcTime } from "~/hooks/useUtcTime";
import { useTimer } from "~/hooks/useTimer";
import { UserAuth } from "~/components/atc/userAuth";
import Image from "next/image";

const DynamicMapComponent = dynamic(() => import("~/components/map"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function ATCPage() {
  const isMobile = useMobileDetection();
  const { aircrafts, isLoading, connectionStatus } = useAircraftStream();
  const { airports } = useAirportData();
  const [selectedAircraft, setSelectedAircraft] =
    useState<PositionUpdate | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<any>(undefined);
  const [historyPath, setHistoryPath] = useState<[number, number][] | null>(
    null,
  );
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const { searchTerm, setSearchTerm, searchResults } = useAircraftSearch(
    aircrafts,
    airports,
  );
  const time = useUtcTime();
  const { formattedTime, isRunning, start, stop, reset } = useTimer();
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const drawFlightPlanOnMapRef = useRef<
    ((ac: PositionUpdate, zoom?: boolean) => void) | null
  >(null);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* --- VIGNETTE / OVERLAY GRADIENT (Makes UI readable over map) --- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[10009] h-32 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />
      {/* Change header to items-start and add top padding */}
      <header className="absolute top-0 right-0 left-0 z-[10010] flex h-20 items-start justify-between px-6 pt-5">
        {/* Left Section */}
        <div className="flex items-center gap-6">
          <div className="hidden flex-col items-center justify-center pt-1 md:flex">
            <Image
              src="/favicon.ico"
              alt="ATC Radar Logo"
              width={32}
              height={32}
              className="mb-1 select-none"
            />
            <div className="h-[2px] w-full bg-gradient-to-r from-cyan-500 to-transparent opacity-50" />
          </div>

          {isMapLoaded && (
            /* IMPORTANT: h-11 matches your SearchBar input height */
            <div className="pointer-events-auto h-11 w-80 lg:w-96">
              <SearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchResults={searchResults}
                isMobile={isMobile}
                onSelectAircraft={(ac) => {
                  setSelectedAircraft(ac);
                  drawFlightPlanOnMapRef.current?.(ac, true);
                  setSearchTerm("");
                }}
                onSelectAirport={(ap) => {
                  setSelectedAirport(ap);
                  setSearchTerm("");
                }}
              />
            </div>
          )}
        </div>

        {/* Center Section: Absolute remains at the same visual height */}
        <div className="pointer-events-auto absolute left-1/2 -translate-x-1/2 pt-0">
          <button
            onClick={() => setShowTimerPopup(!showTimerPopup)}
            className="group flex min-h-[44px] flex-col items-center justify-center rounded-full border border-white/10 bg-black/40 px-4 py-1.5 backdrop-blur-md transition-all hover:border-cyan-500/50 hover:bg-black/60"
          >
            <span className="font-mono text-xl leading-none font-medium tracking-tight text-cyan-400 group-hover:text-cyan-300">
              {time} <span className="text-[10px] text-slate-500">UTC</span>
            </span>
            {isRunning && (
              <span className="mt-1 animate-pulse font-mono text-[9px] leading-none tracking-[0.2em] text-emerald-400 uppercase">
                Timer Active
              </span>
            )}
          </button>
        </div>

        {/* Right Section: Align with top padding */}
        <div className="pointer-events-auto flex min-h-[44px] items-center justify-center gap-4 rounded-full border border-white/5 bg-black/20 px-3 py-1.5 backdrop-blur-sm">
          <div className="flex items-center">
            <ConnectionStatusIndicator
              status={connectionStatus}
              isMobile={isMobile}
            />
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center justify-center">
            <UserAuth />
          </div>
        </div>
      </header>

      {/* --- TIMER POPUP (Transparent/Blur style) --- */}
      {showTimerPopup && (
        <div className="animate-in fade-in zoom-in-95 absolute top-20 left-1/2 z-[10011] w-64 -translate-x-1/2 duration-200">
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-2xl">
            <div className="mb-4 text-center">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">
                Chrono
              </span>
              <div className="font-mono text-3xl font-light text-white">
                {formattedTime}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={isRunning ? stop : start}
                className={`flex-1 rounded-xl py-2.5 text-[10px] font-bold tracking-wider uppercase transition-all ${
                  isRunning
                    ? "border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                }`}
              >
                {isRunning ? "Stop" : "Start"}
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/10 py-2.5 text-[10px] font-bold tracking-wider text-blue-400 uppercase transition-all hover:bg-blue-500/20"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MAP --- */}
      <main className="absolute inset-0 z-0">
        {isLoading && aircrafts.length === 0 ? (
          <Loading />
        ) : (
          <DynamicMapComponent
            aircrafts={aircrafts}
            airports={airports}
            onAircraftSelect={handleAircraftSelect}
            selectedAirport={selectedAirport}
            setDrawFlightPlanOnMap={(func) => {
              drawFlightPlanOnMapRef.current = func;
            }}
            onMapReady={() => setIsMapLoaded(true)}
            historyPath={historyPath}
          />
        )}
      </main>

      {/* --- SIDEBAR (Glass/Blur) --- */}
      {selectedAircraft && (
        <aside className="fixed inset-y-0 right-0 z-[10012] w-[400px]">
          <Sidebar
            aircraft={selectedAircraft}
            onWaypointClick={() => {
              /* No-op: Waypoint click handled via props if needed */
            }}
            onHistoryClick={(path) => {
              setHistoryPath(path);
              setIsViewingHistory(true);
            }}
            isMobile={isMobile}
          />
        </aside>
      )}
    </div>
  );

  function handleAircraftSelect(aircraft: PositionUpdate | null) {
    setIsViewingHistory(false);
    setHistoryPath(null);
    setSelectedAircraft(aircraft);
    setSelectedAirport(undefined);
  }
}
