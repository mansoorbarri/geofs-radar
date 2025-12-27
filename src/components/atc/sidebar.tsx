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

const getAirlineLogoFromFlightNumber = (
  flightNo?: string,
): string | null => {
  const code = extractAirlineFromFlightNumber(flightNo);
  if (!code) return null;
  return `https://content.airhex.com/content/logos/airlines_${code}_200_200_s.png`;
};

export const Sidebar = ({
  aircraft,
  onWaypointClick,
  onHistoryClick,
  isMobile,
}: {
  aircraft: PositionUpdate & {
    altMSL?: number;
  };
  onWaypointClick?: (waypoint: any, index: number) => void;
  onHistoryClick?: (path: [number, number][]) => void;
  isMobile: boolean;
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
              className="group flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-3.5 transition hover:bg-black/60 hover:border-cyan-500/40 cursor-pointer"
              onClick={() => onWaypointClick?.(wp, i)}
            >
              <div className="font-mono text-xs font-black text-cyan-400">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-white tracking-wider">
                    {wp.ident}
                  </span>
                  <span className="font-mono text-[9px] text-white/40 font-bold uppercase">
                    {wp.type}
                  </span>
                </div>
                <div className="flex gap-4 font-mono text-[10px] text-white/60 font-bold">
                  <span>
                    ALT: <span className="text-cyan-100/90">{wp.alt ?? "---"}</span>
                  </span>
                  <span>
                    SPD: <span className="text-cyan-100/90">{wp.spd ?? "---"}</span>
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

  return (
    <div
      ref={containerRef}
      className={`flex flex-col overflow-hidden text-white transition-all duration-500 ease-in-out ${
        isMobile
          ? "fixed inset-x-0 bottom-0 rounded-t-[2.5rem] border-t border-white/20 bg-[#050f14]"
          : "h-full w-full bg-[#050f14]/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl"
      }`}
      style={{ height: isMobile ? (isExpanded ? "88vh" : "240px") : "100%" }}
    >
      <div className="relative p-6 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <span className="font-mono text-[10px] font-black tracking-[0.2em] text-cyan-400 uppercase">
                Active Radar Lock
              </span>
            </div>
            <h1 className="truncate font-mono text-4xl font-black tracking-tighter text-white leading-none mb-1 uppercase">
              {aircraft.flightNo || aircraft.callsign || "N/A"}
            </h1>
            <p className="truncate font-mono text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
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
  <div className="group rounded-2xl border border-white/10 bg-black/40 p-4 transition-all hover:bg-black/60 shadow-lg">
    <div className="font-mono text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase mb-2 group-hover:text-cyan-400/80 transition-colors">
      {label}
    </div>
    <div className="flex items-baseline gap-1.5">
      <div id={id} className="truncate font-mono text-lg font-black text-white tracking-tighter">
        {value}
      </div>
      <span className="font-mono text-[9px] font-black text-cyan-400 uppercase tracking-tighter opacity-80">
        {sub}
      </span>
    </div>
  </div>
);