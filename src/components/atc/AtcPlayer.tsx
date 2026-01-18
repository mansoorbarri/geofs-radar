"use client";

import { Radio, Volume2, VolumeX, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { useAtcAudio } from "~/hooks/useAtcAudio";

interface AtcPlayerProps {
  icao: string;
  onClose: () => void;
}

export function AtcPlayer({ icao, onClose }: AtcPlayerProps) {
  const {
    feeds,
    currentFeed,
    isPlaying,
    isLoading,
    error,
    play,
    stop,
    setVolume,
    volume,
  } = useAtcAudio(icao);

  return (
    <div className="fixed bottom-24 left-1/2 z-[10013] w-[320px] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/90 p-4 backdrop-blur-xl">
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
      <div className="mb-3 grid grid-cols-3 gap-2">
        {feeds.map((feed) => (
          <button
            key={feed.url}
            onClick={() => (currentFeed?.url === feed.url && isPlaying ? stop() : play(feed))}
            disabled={isLoading && currentFeed?.url === feed.url}
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
              currentFeed?.url === feed.url && isPlaying
                ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/50"
                : currentFeed?.url === feed.url && isLoading
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isLoading && currentFeed?.url === feed.url ? (
              <Loader2 className="mx-auto h-3 w-3 animate-spin" />
            ) : (
              feed.name
            )}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Now Playing */}
      {isPlaying && currentFeed && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2">
          <div className="flex gap-0.5">
            <span className="h-3 w-0.5 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: "0ms" }} />
            <span className="h-3 w-0.5 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: "150ms" }} />
            <span className="h-3 w-0.5 animate-pulse rounded-full bg-cyan-400" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-cyan-400">Playing {currentFeed.name}</span>
        </div>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
          className="text-slate-400 transition-colors hover:text-white"
        >
          {volume === 0 ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400"
        />
      </div>

      {/* Fallback Link */}
      <a
        href={`https://www.liveatc.net/search/?icao=${icao}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 py-2 text-xs text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <span>Open on LiveATC</span>
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
