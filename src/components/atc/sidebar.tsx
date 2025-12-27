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
  TbPointFilled,
} from "react-icons/tb";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { getFlightHistory } from "~/app/actions/get-flight-history";
import { getUserProfile } from "~/app/actions/get-user-profile";
import Image from "next/image";

const getFlightPhase = (altAGL: number, vspeed: number, flightPlan?: string) => {
  if (altAGL < 100) return "onGround";
  if (vspeed > 200) return "climbing";
  if (vspeed < -200)
    return flightPlan && altAGL < 5000 ? "landing" : "descending";
  if (altAGL > 5000) return "cruising";
  return "unknown";
};

export const Sidebar = ({
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
  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const altMSL = aircraft.altMSL ?? aircraft.alt;
    const mslVal =
      altMSL >= 18000
        ? `FL${Math.round(altMSL / 100)}`
        : `${Math.round(altMSL).toLocaleString()}`;

    const targets = {
      "side-alt": mslVal,
      "side-spd": Math.round(aircraft.speed || 0).toString(),
      "side-vs": `${aircraft.vspeed || 0}`,
      "side-hdg": `${Math.round(aircraft.heading || 0)}°`,
      "side-agl": `${Math.round(aircraft.alt)}`,
      "side-sqk": aircraft.squawk || "---",
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
      getFlightPhase(aircraft.alt, Number(aircraft.vspeed), aircraft.flightPlan),
    [aircraft.alt, aircraft.vspeed, aircraft.flightPlan],
  );

  useEffect(() => {
    if (aircraft.googleId) {
      getUserProfile(aircraft.googleId)
        .then(setDbProfile)
        .catch(() => setDbProfile(null));
    } else {
      setDbProfile(null);
    }
  }, [aircraft.googleId]);

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
    } catch { return null; }
  }, [aircraft.flightPlan, onWaypointClick]);

  const displayLogo = (aircraft as any).airlineLogo || dbProfile?.airlineLogo;

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
              {aircraft.callsign || aircraft.flightNo || "N/A"}
            </h1>
            <p className="truncate font-mono text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">
              {aircraft.type || "Unknown Class"}
            </p>
          </div>
          <div className="relative">
            {displayLogo ? (
              <Image
                src={displayLogo}
                alt="Logo"
                width={64}
                height={64}
                className="relative rounded-2xl border border-white/20 bg-black object-contain p-2 shadow-xl"
                unoptimized
              />
            ) : (
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/20">
                <TbPlane size={32} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/40 p-1.5 shadow-inner">
          <div className="flex flex-col items-center p-3.5 rounded-xl">
            <span className="font-mono text-[9px] font-black uppercase text-slate-400 mb-1.5">
              Altitude
            </span>
            <span id="side-alt" className="font-mono text-base font-black text-white tracking-tight leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
              ---
            </span>
            <span className="font-mono text-[8px] font-black text-cyan-400/80 uppercase tracking-widest mt-0.5">
              FT MSL
            </span>
          </div>
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-white/10 border border-white/10 shadow-lg scale-105 z-10">
            <TbPlaneInflight size={20} className="text-cyan-400" />
            <span className="font-mono text-[10px] font-black text-white mt-1.5 uppercase tracking-wide">
              {currentFlightPhase}
            </span>
          </div>
          <div className="flex flex-col items-center p-3.5 rounded-xl">
            <span className="font-mono text-[9px] font-black uppercase text-slate-400 mb-1.5">
              Speed
            </span>
            <span id="side-spd" className="font-mono text-base font-black text-white tracking-tight leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">
              ---
            </span>
            <span className="font-mono text-[8px] font-black text-cyan-400/80 uppercase tracking-widest mt-0.5">
              KNOTS GS
            </span>
          </div>
        </div>
      </div>

      <nav className="flex px-6 mb-5">
        <div className="flex w-full rounded-2xl bg-black/60 p-1.5 border border-white/10 shadow-xl">
          <button
            onClick={() => setTab("info")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-[10px] font-black transition-all ${
              tab === "info" ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
            }`}
          >
            <TbInfoCircle size={14} /> LIVE DATA
          </button>
          <button
            onClick={() => setTab("history")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-mono text-[10px] font-black transition-all ${
              tab === "history" ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-white"
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
              <StatBox label="Departure" value={aircraft.departure || "---"} sub="ORIG" />
              <StatBox label="Arrival" value={aircraft.arrival || "---"} sub="DEST" />
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
                <div className="h-6 w-6 rounded-full border-2 border-cyan-400 animate-spin mb-4" />
                <span className="font-mono text-[11px] font-black tracking-widest">LOADING</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center font-mono text-[10px] text-white/40 tracking-widest uppercase">
                No Records
              </div>
            ) : (
              history.map((f) => (
                <div
                  key={f.id}
                  onClick={() => f.routeData && onHistoryClick?.(f.routeData as [number, number][])}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 transition-all hover:border-cyan-500/40 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center justify-between mb-1.5">
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
  <div className="group rounded-2xl border border-white/10 bg-black/40 p-4 transition-all hover:bg-black/60 shadow-lg">
    <div className="font-mono text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase mb-2 group-hover:text-cyan-400/80 transition-colors">
      {label}
    </div>
    <div className="flex items-baseline gap-1.5">
      <div id={id} className="truncate font-mono text-lg font-black text-white tracking-tighter drop-shadow-[0_0_5px_rgba(255,255,255,0.05)]">
        {value}
      </div>
      <span className="font-mono text-[9px] font-black text-cyan-400 uppercase tracking-tighter opacity-80">
        {sub}
      </span>
    </div>
  </div>
);