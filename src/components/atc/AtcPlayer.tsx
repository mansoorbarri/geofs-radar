"use client";

import { Radio, X, ExternalLink, Volume2 } from "lucide-react";
import { useState } from "react";

interface AtcPlayerProps {
  icao: string;
  onClose: () => void;
}

const FEED_TYPES = [
  { suffix: "twr", name: "Tower" },
  { suffix: "app", name: "Approach" },
  { suffix: "gnd", name: "Ground" },
  { suffix: "del", name: "Delivery" },
  { suffix: "dep", name: "Departure" },
  { suffix: "atis", name: "ATIS" },
  { suffix: "ctr", name: "Center" },
];

export function AtcPlayer({ icao, onClose }: AtcPlayerProps) {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const lowerIcao = icao.toLowerCase();

  const embedUrl = selectedFeed
    ? `https://www.liveatc.net/player/?icao=${lowerIcao}_${selectedFeed}`
    : null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[10013] w-[340px] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/90 p-4 backdrop-blur-xl">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm text-cyan-400">{icao} ATC</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Feed Selection */}
      <div className="mb-3 grid grid-cols-4 gap-2">
        {FEED_TYPES.map((feed) => (
          <button
            key={feed.suffix}
            onClick={() => setSelectedFeed(feed.suffix)}
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
              selectedFeed === feed.suffix
                ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50"
                : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {feed.name}
          </button>
        ))}
      </div>

      {/* Embed Player */}
      {selectedFeed ? (
        <div className="mb-3 overflow-hidden rounded-lg bg-black">
          <iframe
            src={embedUrl!}
            width="100%"
            height="80"
            frameBorder="0"
            scrolling="no"
            allow="autoplay"
            className="bg-black"
          />
          <p className="px-2 py-1.5 text-center text-[10px] text-slate-500">
            If player doesn&apos;t load, feed may not exist for this airport
          </p>
        </div>
      ) : (
        <div className="mb-3 flex flex-col items-center justify-center rounded-lg bg-white/5 py-6 text-center">
          <Volume2 className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-xs text-slate-400">Select a feed type above</p>
        </div>
      )}

      {/* LiveATC Link */}
      <a
        href={`https://www.liveatc.net/search/?icao=${icao}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span>Browse all {icao} feeds on LiveATC</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
