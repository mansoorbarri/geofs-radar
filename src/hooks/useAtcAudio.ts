"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";

interface AtcFeed {
  name: string;
  url: string;
}

interface UseAtcAudioReturn {
  feeds: AtcFeed[];
  currentFeed: AtcFeed | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  play: (feed: AtcFeed) => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  volume: number;
}

// Common LiveATC feed suffixes
const FEED_TYPES = [
  { suffix: "_Twr", name: "Tower" },
  { suffix: "_App", name: "Approach" },
  { suffix: "_Gnd", name: "Ground" },
  { suffix: "_Del", name: "Delivery" },
  { suffix: "_Dep", name: "Departure" },
  { suffix: "_ATIS", name: "ATIS" },
  { suffix: "_Ctr", name: "Center" },
];

export function useAtcAudio(icao: string | undefined): UseAtcAudioReturn {
  const [feeds, setFeeds] = useState<AtcFeed[]>([]);
  const [currentFeed, setCurrentFeed] = useState<AtcFeed | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.7);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentFeed(null);
  }, []);

  // Probe for available feeds when ICAO changes
  useEffect(() => {
    if (!icao) {
      setFeeds([]);
      cleanup();
      return;
    }

    const upperIcao = icao.toUpperCase();
    const controller = new AbortController();

    async function probeFeeds() {
      const availableFeeds: AtcFeed[] = [];

      // Probe each feed type through our proxy
      const probePromises = FEED_TYPES.map(async ({ suffix, name }) => {
        const feedId = `${upperIcao}${suffix}`;
        const proxyUrl = `/api/atc-stream/${feedId}`;

        try {
          const response = await fetch(proxyUrl, {
            method: "HEAD",
            signal: controller.signal,
          });

          if (response.ok) {
            return { name, url: proxyUrl };
          }
          return null;
        } catch {
          return null;
        }
      });

      const results = await Promise.all(probePromises);
      const validFeeds = results.filter((f): f is AtcFeed => f !== null);

      if (validFeeds.length > 0) {
        setFeeds(validFeeds);
      } else {
        // If no feeds found, still show options (they may work)
        setFeeds(
          FEED_TYPES.map(({ suffix, name }) => ({
            name,
            url: `/api/atc-stream/${upperIcao}${suffix}`,
          }))
        );
      }
    }

    probeFeeds();

    return () => {
      controller.abort();
    };
  }, [icao, cleanup]);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    return () => {
      cleanup();
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, [cleanup, volume]);

  const play = useCallback((feed: AtcFeed) => {
    if (!audioRef.current) return;

    cleanup();
    setIsLoading(true);
    setError(null);
    setCurrentFeed(feed);

    const audio = audioRef.current;
    audio.volume = volume;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Stream unavailable or failed to load");
          setIsLoading(false);
          setIsPlaying(false);
          hls.destroy();
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setError("Failed to play audio");
            setIsPlaying(false);
          });
      });

      hls.loadSource(feed.url);
      hls.attachMedia(audio);
      hlsRef.current = hls;
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      audio.src = feed.url;
      audio.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        audio.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setError("Failed to play audio");
            setIsPlaying(false);
          });
      });
      audio.addEventListener("error", () => {
        setError("Stream unavailable or failed to load");
        setIsLoading(false);
        setIsPlaying(false);
      });
    } else {
      setError("HLS playback not supported in this browser");
      setIsLoading(false);
    }
  }, [cleanup, volume]);

  const stop = useCallback(() => {
    cleanup();
    setError(null);
  }, [cleanup]);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  return {
    feeds,
    currentFeed,
    isPlaying,
    isLoading,
    error,
    play,
    stop,
    setVolume,
    volume,
  };
}
