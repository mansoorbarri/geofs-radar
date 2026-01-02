"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import dynamic from "next/dynamic";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { useMobileDetection } from "~/hooks/useMobileDetection";
import { useAircraftStream } from "~/hooks/useAircraftStream";
import { useAirportData } from "~/hooks/useAirportData";
import { useAircraftSearch } from "~/hooks/useAircraftSearch";
import { ConnectionStatusIndicator } from "~/components/atc/connectionStatusIndicator";
import { SearchBar } from "~/components/atc/searchbar";
import { Sidebar } from "~/components/atc/sidebar";
import { CallsignFilter } from "~/components/atc/callsignFilter";
import Loading from "~/components/loading";
import { useUtcTime } from "~/hooks/useUtcTime";
import { useTimer } from "~/hooks/useTimer";
import { UserAuth } from "~/components/atc/userAuth";
import { useAirportChart } from "~/hooks/useAirportCharts";
import { TaxiChartViewer } from "~/components/airports/TaxiChartsViewer";
import { useUserCapabilities } from "~/hooks/useUserCapabilities";
import Image from "next/image";
import { useRouter } from "next/navigation";

const DynamicMapComponent = dynamic(() => import("~/components/map"), {
  ssr: false,
  loading: () => <Loading />,
});

export default function ATCPage() {
  const router = useRouter();
  const isMobile = useMobileDetection();
  const { aircrafts, isLoading, connectionStatus } = useAircraftStream();
  const { airports } = useAirportData();

  const { canViewTaxiCharts } = useUserCapabilities();

  const [selectedAircraft, setSelectedAircraft] =
    useState<PositionUpdate | null>(null);
  const [selectedAirport, setSelectedAirport] = useState<any>(undefined);
  const [historyPath, setHistoryPath] = useState<[number, number][] | null>(
    null,
  );
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [selectedCallsigns, setSelectedCallsigns] = useState<Set<string>>(
    new Set(),
  );
  const [showCallsignFilter, setShowCallsignFilter] = useState(false);
  const { searchTerm, setSearchTerm, searchResults } = useAircraftSearch(
    aircrafts,
    airports,
  );

  const time = useUtcTime();
  const { formattedTime, isRunning, start, stop, reset } = useTimer();
  const [showTimerPopup, setShowTimerPopup] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const [showTaxiChart, setShowTaxiChart] = useState(false);
  const { chart } = useAirportChart(selectedAirport?.icao);

  const drawFlightPlanOnMapRef = useRef<
    ((ac: PositionUpdate, zoom?: boolean) => void) | null
  >(null);

  const filteredAircrafts = useMemo(() => {
    if (selectedCallsigns.size === 0) return aircrafts;

    const prefixRegex = /^[A-Z]+/;

    return aircrafts.filter((aircraft) => {
      if (!aircraft.flightNo) return false;
      const upperFlightNo = aircraft.flightNo.trim().toUpperCase();
      const match = prefixRegex.exec(upperFlightNo);
      const prefix = match?.[0];
      return prefix && prefix.length >= 2 && selectedCallsigns.has(prefix);
    });
  }, [aircrafts, selectedCallsigns]);

  const handleToggleCallsign = useCallback((prefix: string) => {
    setSelectedCallsigns((prev) => {
      const next = new Set(prev);
      if (next.has(prefix)) {
        next.delete(prefix);
      } else {
        next.add(prefix);
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCallsigns(new Set());
  }, []);

  useEffect(() => {
    if (!selectedAircraft || isViewingHistory) return;

    const updatedAircraft = aircrafts.find(
      (ac) =>
        (ac.id && ac.id === selectedAircraft.id) ||
        (ac.callsign && ac.callsign === selectedAircraft.callsign),
    );

    if (updatedAircraft) {
      setSelectedAircraft(updatedAircraft);
    }
  }, [aircrafts, isViewingHistory, selectedAircraft]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[10009] h-32 bg-gradient-to-b from-black/80 via-black/20 to-transparent" />

      <header className="absolute top-0 right-0 left-0 z-[10010] flex h-20 items-start justify-between px-6 pt-5">
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

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <div className="flex min-h-[44px] items-center justify-center gap-4 rounded-full border border-white/5 bg-black/20 px-3 py-1.5 backdrop-blur-sm">
            <ConnectionStatusIndicator
              status={connectionStatus}
              isMobile={isMobile}
            />
            <div className="h-4 w-[1px] bg-white/10" />
            <UserAuth />
          </div>

          <button
            onClick={() => setShowCallsignFilter(!showCallsignFilter)}
            className={`flex h-11 items-center gap-2 rounded-xl border px-4 transition-all ${
              selectedCallsigns.size > 0
                ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                : "border-white/10 bg-black/40 text-slate-400 hover:border-white/20 hover:bg-black/60"
            } backdrop-blur-md`}
          >
            <span className="text-xs font-medium">Filter</span>
          </button>
        </div>
      </header>

      <main className="absolute inset-0 z-0">
        {isLoading && aircrafts.length === 0 ? (
          <Loading />
        ) : (
          <DynamicMapComponent
            aircrafts={filteredAircrafts}
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

      {selectedAircraft && (
        <aside className="fixed inset-y-0 right-0 z-[10012] w-[400px]">
          <Sidebar
            aircraft={selectedAircraft}
            onWaypointClick={undefined}
            onHistoryClick={(path) => {
              setHistoryPath(path);
              setIsViewingHistory(true);
            }}
            isMobile={isMobile}
          />
        </aside>
      )}
      
      {selectedAirport && (
        <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[10012] -translate-x-1/2">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/80 px-5 py-3 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col">
              <span className="font-mono text-xs font-semibold text-cyan-300">
                {selectedAirport.icao}
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedAirport.name}
              </span>
            </div>

            {canViewTaxiCharts ? (
              <button
                onClick={() => setShowTaxiChart(true)}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] uppercase tracking-wide text-cyan-300 hover:bg-cyan-500/20"
              >
                Taxi Chart
              </button>
            ) : (
              <button
                onClick={() => router.push("/upgrade")}
                className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-[10px] uppercase tracking-wide text-yellow-400 hover:bg-yellow-500/20"
              >
                Taxi Charts (Premium)
              </button>
            )}

            <button
              onClick={() => setSelectedAirport(undefined)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-wide text-white/60 hover:bg-white/10"
            >
              Unselect
            </button>
          </div>
          
        </div>
      )}

      {showTaxiChart && chart && (
        <TaxiChartViewer
          chart={chart}
          onClose={() => setShowTaxiChart(false)}
        />
      )}
    </div>
  );

  function handleAircraftSelect(aircraft: PositionUpdate | null) {
    setIsViewingHistory(false);
    setHistoryPath(null);
    setSelectedAircraft(aircraft);

    if (aircraft) {
      setSelectedAirport(undefined);
    }
  }
}