"use client";

import { Radio, X, ExternalLink, Volume2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface AtcFeed {
  name: string;
  mount: string;
  frequency?: string;
}

interface AtcPlayerProps {
  icao: string;
  onClose: () => void;
}

export function AtcPlayer({ icao, onClose }: AtcPlayerProps) {
  const [feeds, setFeeds] = useState<AtcFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<AtcFeed | null>(null);

  const lowerIcao = icao.toLowerCase();

  // Fetch available feeds for this airport
  useEffect(() => {
    setLoading(true);
    setSelectedFeed(null);
    setFeeds([]);

    fetch(`/api/atc-feeds/${icao}`)
      .then((res) => res.json())
      .then((data) => {
        setFeeds(data.feeds || []);
        setLoading(false);
      })
      .catch(() => {
        setFeeds([]);
        setLoading(false);
      });
  }, [icao]);

  const listenUrl = selectedFeed
    ? `https://www.liveatc.net/hlisten.php?mount=${selectedFeed.mount}&icao=${lowerIcao}`
    : null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[10013] w-[360px] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/90 p-4 backdrop-blur-xl">
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
      {loading ? (
        <div className="mb-3 flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="ml-2 text-sm text-slate-400">Loading feeds...</span>
        </div>
      ) : feeds.length > 0 ? (
        <div className="mb-3 max-h-[200px] space-y-1 overflow-y-auto">
          {feeds.map((feed) => (
            <button
              key={feed.mount}
              onClick={() => setSelectedFeed(feed)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all ${
                selectedFeed?.mount === feed.mount
                  ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50"
                  : "bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span className="font-medium">{feed.name}</span>
              {feed.frequency && (
                <span className="font-mono text-xs text-slate-500">
                  {feed.frequency}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-3 flex flex-col items-center justify-center rounded-lg bg-white/5 py-6 text-center">
          <Volume2 className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-xs text-slate-400">No feeds found for {icao}</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Try browsing LiveATC directly
          </p>
        </div>
      )}

      {/* Embed Player */}
      {selectedFeed && (
        <div className="mb-3 overflow-hidden rounded-lg bg-black">
          <iframe
            src={listenUrl!}
            width="100%"
            height="140"
            frameBorder="0"
            scrolling="no"
            allow="autoplay"
            className="bg-black"
          />
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
