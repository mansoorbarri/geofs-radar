"use client";

import React, {
  useMemo,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  TbPlaneInflight,
  TbPlaneDeparture,
  TbPlane,
  TbPlaneArrival,
  TbHistory,
  TbInfoCircle,
  TbUserCircle,
} from "react-icons/tb";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { getFlightHistory } from "~/app/actions/get-flight-history";
import { getUserProfile } from "~/app/actions/get-user-profile";
import Image from "next/image";

const getFlightPhase = (
  altAGL: number,
  vspeed: number,
  flightPlan?: string,
) => {
  const isOnGround = altAGL < 100;
  const isClimbing = vspeed > 200;
  const isDescending = vspeed < -200;

  if (isOnGround) return "onGround";
  if (isClimbing) return "climbing";
  if (isDescending)
    return flightPlan && altAGL < 5000 ? "landing" : "descending";
  if (altAGL > 5000) return "cruising";
  return "unknown";
};

export const Sidebar = React.memo(
  ({
    aircraft,
    onWaypointClick,
    onHistoryClick,
    isMobile,
  }: {
    aircraft: PositionUpdate & {
      altMSL?: number;
      googleId?: string;
      role?: string;
    };
    onWaypointClick?: (waypoint: any, index: number) => void;
    onHistoryClick?: (path: [number, number][]) => void;
    isMobile: boolean;
  }) => {
    const [tab, setTab] = useState<"info" | "history">("info");
    const [history, setHistory] = useState<any[]>([]);
    const [dbProfile, setDbProfile] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [selectedFlightId, setSelectedFlightId] = useState<string | null>(
      null,
    );
    const [isExpanded, setIsExpanded] = useState(false);
    const [dragStart, setDragStart] = useState<number | null>(null);
    const [dragOffset, setDragOffset] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const altMSL = aircraft.altMSL ?? aircraft.alt;
    const altAGL = aircraft.alt;

    // Use DB role if available, fallback to aircraft object
    const currentRole = dbProfile?.role || aircraft.role;
    const isPremium = currentRole === "PREMIUM";

    // Priority: DB Logo -> SSE Logo -> Placeholder
    const displayLogo = dbProfile?.airlineLogo || (aircraft as any).airlineLogo;

    const currentFlightPhase = useMemo(
      () =>
        getFlightPhase(altAGL, Number(aircraft.vspeed), aircraft.flightPlan),
      [altAGL, aircraft.vspeed, aircraft.flightPlan],
    );

    // Fetch Profile (Logo/Role)
    useEffect(() => {
      if (aircraft.googleId) {
        getUserProfile(aircraft.googleId)
          .then(setDbProfile)
          .catch(console.error);
      } else {
        setDbProfile(null);
      }
    }, [aircraft.googleId]);

    // Fetch History
    useEffect(() => {
      if (tab === "history" && aircraft.googleId && isPremium) {
        setLoadingHistory(true);
        getFlightHistory(aircraft.googleId)
          .then(setHistory)
          .catch(console.error)
          .finally(() => setLoadingHistory(false));
      }
    }, [tab, aircraft.googleId, isPremium]);

    const getPhaseIcon = (phase: string) => {
      const iconProps = { size: 20, strokeWidth: 1.4, color: "#fff" };
      switch (phase) {
        case "climbing":
          return <TbPlaneDeparture {...iconProps} />;
        case "cruising":
          return <TbPlaneInflight {...iconProps} />;
        case "descending":
        case "landing":
          return <TbPlaneArrival {...iconProps} />;
        default:
          return <TbPlane {...iconProps} />;
      }
    };

    const phaseTextMap: Record<string, string> = {
      onGround: "Ground",
      climbing: "Climb",
      cruising: "Cruise",
      descending: "Descend",
      landing: "Land",
      unknown: "Flight",
    };

    const displayAltMSL =
      altMSL >= 18000
        ? `FL${Math.round(altMSL / 100)}`
        : `${altMSL.toFixed(0)} ft`;

    const handleTouchStart = (e: React.TouchEvent) => {
      if (isMobile && e.touches[0]) setDragStart(e.touches[0].clientY);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
      if (isMobile && dragStart !== null && e.touches[0])
        setDragOffset(e.touches[0].clientY - dragStart);
    };
    const handleTouchEnd = () => {
      if (isMobile && dragStart !== null) {
        if (dragOffset > 80) setIsExpanded(false);
        else if (dragOffset < -80) setIsExpanded(true);
        setDragStart(null);
        setDragOffset(0);
      }
    };

    const renderFlightPlan = useCallback(() => {
      if (!aircraft.flightPlan)
        return (
          <div className="p-4 text-center text-sm font-medium text-white/60 italic">
            No flight plan available
          </div>
        );
      try {
        const waypoints = JSON.parse(aircraft.flightPlan);
        return (
          <div className="mt-2 h-full overflow-y-auto px-3 pb-3">
            <div className="mb-2 text-xs font-semibold tracking-wide text-white/90 uppercase">
              Flight Plan
            </div>
            {waypoints.map((wp: any, i: number) => (
              <div
                key={i}
                className="mb-2 cursor-pointer rounded-md border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10"
                onClick={() => onWaypointClick?.(wp, i)}
              >
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-semibold text-white">
                    {wp.ident}
                  </span>
                  <span className="text-[10px] text-white/60 uppercase">
                    {wp.type}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-white/70">
                  <span>
                    Alt: <strong>{wp.alt ? `${wp.alt} ft` : "N/A"}</strong>
                  </span>
                  <span>
                    Spd: <strong>{wp.spd ? `${wp.spd} kt` : "N/A"}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        );
      } catch {
        return (
          <div className="p-4 text-center text-sm text-red-400/80">
            Error loading flight plan
          </div>
        );
      }
    }, [aircraft.flightPlan, onWaypointClick]);

    const baseStyle =
      "backdrop-blur-lg text-white flex flex-col z-50 transition-all overflow-hidden";

    return (
      <div
        ref={containerRef}
        style={{
          transform: `translateY(${dragOffset}px)`,
          height: isMobile ? (isExpanded ? "88vh" : "180px") : undefined,
        }}
        className={
          isMobile
            ? `${baseStyle} fixed right-0 bottom-0 left-0 rounded-t-xl border-t border-white/10 bg-gray-900/95 shadow-2xl`
            : `${baseStyle} absolute top-0 right-0 h-full w-[340px] border-l border-white/10 bg-gray-900/95 shadow-xl`
        }
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isMobile && (
          <div className="flex cursor-grab justify-center py-2">
            <div className="h-1 w-10 rounded-full bg-white/30" />
          </div>
        )}

        <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-3">
          <div className="relative">
            {displayLogo ? (
              <Image
                src={displayLogo}
                alt="Airline Logo"
                width={48}
                height={48}
                className="rounded border border-white/10 bg-black/40 object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded border border-dashed border-white/20 bg-white/5 text-white/20">
                <TbPlane size={24} />
              </div>
            )}
            {isPremium && (
              <div className="absolute -top-1.5 -right-1.5 rounded bg-yellow-500 px-1 text-[8px] font-black text-black shadow-sm">
                PRO
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-lg leading-tight font-bold">
              {aircraft.callsign || aircraft.flightNo || "N/A"}
            </div>
            <div className="truncate text-xs font-medium tracking-tighter text-white/60 uppercase">
              {aircraft.type || "Unknown Type"}
            </div>
          </div>
        </div>

        <div className="flex border-b border-white/10 bg-black/20">
          <button
            onClick={() => setTab("info")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-wider transition ${tab === "info" ? "border-b-2 border-blue-500 text-white" : "text-white/40"}`}
          >
            <TbInfoCircle size={16} /> LIVE INFO
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-[11px] font-bold tracking-wider transition ${tab === "history" ? "border-b-2 border-blue-500 text-white" : "text-white/40"}`}
          >
            <TbHistory size={16} /> HISTORY
          </button>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          {tab === "info" ? (
            <div className="flex flex-col gap-2 p-3">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2.5">
                <div className="mb-1 text-[10px] font-semibold text-white/60 uppercase">
                  Callsign
                </div>
                <div className="text-sm font-semibold">
                  {aircraft.flightNo || "N/A"}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-center">
                  <div className="text-sm font-semibold">
                    {aircraft.departure || "UNK"}
                  </div>
                </div>
                <div className="flex w-12 flex-col items-center justify-center text-center text-white">
                  {getPhaseIcon(currentFlightPhase)}
                  <div className="mt-1 text-[9px] text-white/50 uppercase">
                    {phaseTextMap[currentFlightPhase]}
                  </div>
                </div>
                <div className="flex-1 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-center">
                  <div className="text-sm font-semibold">
                    {aircraft.arrival || "UNK"}
                  </div>
                </div>
              </div>

              {(isExpanded || !isMobile) && (
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5 text-sm">
                  <Detail label="Alt MSL" value={displayAltMSL} />
                  <Detail label="Alt AGL" value={`${altAGL.toFixed(0)} ft`} />
                  <Detail
                    label="V-Speed"
                    value={`${aircraft.vspeed || 0} fpm`}
                  />
                  <Detail
                    label="Speed"
                    value={`${aircraft.speed?.toFixed(0)} kt`}
                  />
                  <Detail
                    label="Heading"
                    value={`${aircraft.heading?.toFixed(0)}°`}
                  />
                  <Detail label="Squawk" value={aircraft.squawk || "N/A"} />
                </div>
              )}

              {(isExpanded || !isMobile) && renderFlightPlan()}
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {isPremium ? (
                <>
                  {loadingHistory ? (
                    <div className="animate-pulse py-10 text-center text-xs font-bold text-white/50 uppercase">
                      Fetching logs...
                    </div>
                  ) : history.length === 0 ? (
                    <div className="py-10 text-center text-xs text-white/30 italic">
                      No past flights found for this pilot.
                    </div>
                  ) : (
                    history.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFlightId(f.id);
                          if (f.routeData)
                            onHistoryClick?.(f.routeData as [number, number][]);
                        }}
                        className={`cursor-pointer rounded-lg border bg-white/5 p-3 transition ${selectedFlightId === f.id ? "border-blue-500 bg-blue-500/10" : "border-white/10 hover:bg-white/10"}`}
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-bold text-white">
                            {f.depICAO || "???"} → {f.arrICAO || "???"}
                          </span>
                          <span className="text-[10px] text-white/40">
                            {new Date(f.startTime).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] font-medium text-white/50 uppercase italic">
                          {f.aircraftType || "Unknown"}
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <div className="mt-4 rounded border border-amber-500/20 bg-amber-500/10 p-4 text-center text-[11px] leading-relaxed text-amber-200/80">
                  <div className="mb-1 font-bold tracking-tight text-amber-400 uppercase">
                    Premium Feature
                  </div>
                  Automatic flight logging and history tracking is restricted to
                  Premium pilots.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

Sidebar.displayName = "Sidebar";

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="mb-0.5 text-[10px] font-semibold text-white/50 uppercase">
      {label}
    </div>
    <div className="truncate text-sm font-semibold">{value}</div>
  </div>
);
