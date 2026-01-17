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
  TbPlane,
  TbHistory,
  TbInfoCircle,
} from "react-icons/tb";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { getFlightHistory } from "~/app/actions/get-flight-history";
import Image from "next/image";
import { analytics } from "~/lib/posthog";
import { useAircraftPhoto } from "~/hooks/useAircraftPhoto";

const getFlightPhase = (
  altAGL: number,
  vspeed: number,
  flightPlan?: string,
) => {
  if (altAGL < 100) return "onGround";
  if (vspeed > 200) return "climbing";
  if (vspeed < -200)
    return flightPlan && altAGL < 5000 ? "landing" : "descending";
  if (altAGL > 5000) return "cruising";
  return "unknown";
};

const extractAirlineFromFlightNumber = (flightNo?: string): string | null => {
  const match = flightNo?.match(/^([A-Z]{2,3})/);
  return match?.[1]?.toLowerCase() ?? null;
};

const getAirlineLogoFromFlightNumber = (flightNo?: string): string | null => {
  const code = extractAirlineFromFlightNumber(flightNo);
  if (!code) return null;
  return `https://content.airhex.com/content/logos/airlines_${code}_200_200_s.png?theme=dark`;
};

export const Sidebar = ({
  aircraft,
  onWaypointClick,
  onHistoryClick,
  isMobile,
  onClose,
}: {
  aircraft: PositionUpdate & { altMSL?: number };
  onWaypointClick?: (waypoint: any, index: number) => void;
  onHistoryClick?: (path: [number, number][]) => void;
  isMobile: boolean;
  onClose?: () => void;
}) => {
  const [tab, setTab] = useState<"info" | "history">("info");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const altMSL = Number(aircraft.altMSL ?? aircraft.alt ?? 0);
    const mslVal =
      altMSL >= 18000
        ? `FL${Math.round(altMSL / 100)}`
        : `${Math.round(altMSL).toLocaleString()}`;

    const targets: Record<string, string> = {
      "side-alt": mslVal,
      "side-spd": String(Math.round(Number(aircraft.speed ?? 0))),
      "side-vs": String(Math.round(Number(aircraft.vspeed ?? 0))),
      "side-hdg": `${Math.round(Number(aircraft.heading ?? 0))}°`,
      "side-agl": String(Math.round(Number(aircraft.alt ?? 0))),
      "side-sqk": aircraft.squawk ?? "---",
    };

    for (const [id, val] of Object.entries(targets)) {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    }
  }, [
    aircraft.alt,
    aircraft.altMSL,
    aircraft.speed,
    aircraft.vspeed,
    aircraft.heading,
    aircraft.squawk,
  ]);

  const currentFlightPhase = useMemo(
    () =>
      getFlightPhase(
        Number(aircraft.alt ?? 0),
        Number(aircraft.vspeed ?? 0),
        aircraft.flightPlan,
      ),
    [aircraft.alt, aircraft.vspeed, aircraft.flightPlan],
  );

  useEffect(() => {
    if (tab === "history" && aircraft.googleId) {
      setLoadingHistory(true);
      getFlightHistory(aircraft.googleId)
        .then(setHistory)
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false));
    }
  }, [tab, aircraft.googleId]);

  const renderFlightPlan = useCallback(() => {
    if (!aircraft.flightPlan) return null;
    try {
      const waypoints = JSON.parse(aircraft.flightPlan);
      return (
        <div className="mt-6 space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <div className="h-[1px] flex-1 bg-white/20" />
            <span className="font-mono text-[9px] font-black tracking-[0.3em] text-white/50 uppercase">
              Enroute Path
            </span>
            <div className="h-[1px] flex-1 bg-white/20" />
          </div>
          {waypoints.map((wp: any, i: number) => (
            <div
              key={i}
              className="group flex cursor-pointer items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3.5 transition hover:border-cyan-500/40 hover:bg-black/60"
              onClick={() => onWaypointClick?.(wp, i)}
            >
              <div className="font-mono text-xs font-black text-cyan-400">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black tracking-wider text-white">
                    {wp.ident}
                  </span>
                  <span className="font-mono text-[9px] font-bold text-white/40 uppercase">
                    {wp.type}
                  </span>
                </div>
                <div className="flex gap-4 font-mono text-[10px] font-bold text-white/60">
                  <span>
                    ALT:{" "}
                    <span className="text-cyan-100/90">{wp.alt ?? "---"}</span>
                  </span>
                  <span>
                    SPD:{" "}
                    <span className="text-cyan-100/90">{wp.spd ?? "---"}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    } catch {
      return null;
    }
  }, [aircraft.flightPlan, onWaypointClick]);

  const airlineLogo = getAirlineLogoFromFlightNumber(aircraft.flightNo);
  const { photo: aircraftPhoto } = useAircraftPhoto(
    aircraft.flightNo || aircraft.callsign,
    aircraft.type
  );

  return (
    <div
      ref={containerRef}
      className="flex h-full flex-col overflow-hidden text-white bg-[#050f14]/90"
    >
      {/* Mobile drag handle */}
      {isMobile && (
        <div className="flex items-center justify-center px-4 pt-3 pb-1">
          <div className="h-1 w-12 rounded-full bg-white/30" />
        </div>
      )}

      {/* Aircraft Photo */}
      {aircraftPhoto && (
        <div className="relative mx-4 mt-4 mb-2 overflow-hidden rounded-2xl border border-white/10 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aircraftPhoto.imageUrl}
            alt="Aircraft"
            className="w-full h-auto object-cover"
          />
          {aircraftPhoto.photographer && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
              <span className="font-mono text-[9px] text-white/60">
                Photo: {aircraftPhoto.photographer}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`relative ${isMobile ? 'p-4 pb-2' : 'p-6 pb-4'}`}>
        <div className={`${isMobile ? 'mb-3' : 'mb-5'} flex items-start justify-between`}>
          <div className="min-w-0 flex-1 pr-4">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" />
              <span className="font-mono text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">
                Active Radar Lock
              </span>
            </div>
            <h1 className="mb-1 truncate font-mono text-4xl leading-none font-black tracking-tighter text-white uppercase">
              {aircraft.flightNo || aircraft.callsign || "N/A"}
            </h1>
            <p className="truncate font-mono text-[11px] font-black tracking-[0.15em] text-slate-400 uppercase">
              {aircraft.type || "Unknown Class"}
            </p>
          </div>
          <div className="relative">
            {airlineLogo ? (
              <Image
                src={airlineLogo}
                alt="Airline Logo"
                width={64}
                height={64}
                className="rounded-2xl border border-white/20 bg-black object-contain p-2 shadow-xl"
                unoptimized
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/20">
                <TbPlane size={32} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-inner">
          <div className="flex flex-col items-center rounded-xl p-3.5">
            <span className="mb-1.5 font-mono text-[9px] font-black text-slate-400 uppercase">
              Altitude
            </span>
            <span
              id="side-alt"
              className="font-mono text-base leading-none font-black tracking-tight text-white"
            >
              ---
            </span>
            <span className="mt-0.5 font-mono text-[8px] font-black tracking-widest text-cyan-400/80 uppercase">
              FT MSL
            </span>
          </div>
          <div className="z-10 flex scale-105 flex-col items-center rounded-xl border border-white/10 bg-white/10 p-3.5 shadow-lg">
            <TbPlaneInflight size={20} className="text-cyan-400" />
            <span className="mt-1.5 font-mono text-[10px] font-black tracking-wide text-white uppercase">
              {currentFlightPhase}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-xl p-3.5">
            <span className="mb-1.5 font-mono text-[9px] font-black text-slate-400 uppercase">
              Speed
            </span>
            <span
              id="side-spd"
              className="font-mono text-base leading-none font-black tracking-tight text-white"
            >
              ---
            </span>
            <span className="mt-0.5 font-mono text-[8px] font-black tracking-widest text-cyan-400/80 uppercase">
              KNOTS GS
            </span>
          </div>
        </div>
      </div>

      <nav className="mb-5 flex px-6">
        <div className="flex w-full rounded-2xl border border-white/10 bg-black/60 p-1.5 shadow-xl">
          <button
            onClick={() => {
              setTab("info");
              analytics.sidebarTabChanged("info");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-[10px] font-black transition-all ${
              tab === "info"
                ? "bg-white text-black shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TbInfoCircle size={14} /> LIVE DATA
          </button>
          <button
            onClick={() => {
              setTab("history");
              analytics.sidebarTabChanged("history");
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-[10px] font-black transition-all ${
              tab === "history"
                ? "bg-white text-black shadow-lg"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TbHistory size={14} /> LOGBOOK
          </button>
        </div>
      </nav>

      <div className="custom-scrollbar flex-1 overflow-y-auto px-6 pb-12">
        {tab === "info" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3.5">
              <StatBox
                label="Departure"
                value={aircraft.departure || "---"}
                sub="ORIG"
              />
              <StatBox
                label="Arrival"
                value={aircraft.arrival || "---"}
                sub="DEST"
              />
              <StatBox label="V-Speed" id="side-vs" value="---" sub="FPM" />
              <StatBox label="Heading" id="side-hdg" value="---" sub="MAG" />
              <StatBox label="Squawk" id="side-sqk" value="---" sub="XPDR" />
              <StatBox label="Alt AGL" id="side-agl" value="---" sub="FEET" />
            </div>
            {renderFlightPlan()}
          </div>
        ) : (
          <div className="space-y-3">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-60">
                <div className="mb-4 h-6 w-6 animate-spin rounded-full border-2 border-cyan-400" />
                <span className="font-mono text-[11px] font-black tracking-widest">
                  LOADING
                </span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center font-mono text-[10px] tracking-widest text-white/40 uppercase">
                No Records
              </div>
            ) : (
              history.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    if (f.routeData) {
                      analytics.historyFlightClicked();
                      onHistoryClick?.(f.routeData as [number, number][]);
                    }
                  }}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 shadow-lg transition-all hover:border-cyan-500/40"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-white group-hover:text-cyan-400">
                      {f.depICAO} → {f.arrICAO}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-white/30">
                      {new Date(f.startTime).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox = ({
  label,
  value,
  id,
  sub,
}: {
  label: string;
  value: string;
  id?: string;
  sub: string;
}) => (
  <div className="group rounded-2xl border border-white/10 bg-black/40 p-4 shadow-lg transition-all hover:bg-black/60">
    <div className="mb-2 font-mono text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase transition-colors group-hover:text-cyan-400/80">
      {label}
    </div>
    <div className="flex items-baseline gap-1.5">
      <div
        id={id}
        className="truncate font-mono text-lg font-black tracking-tighter text-white"
      >
        {value}
      </div>
      <span className="font-mono text-[9px] font-black tracking-tighter text-cyan-400 uppercase opacity-80">
        {sub}
      </span>
    </div>
  </div>
);
