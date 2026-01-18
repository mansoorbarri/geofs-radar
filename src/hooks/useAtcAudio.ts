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

// Common LiveATC feed suffixes to try
const FEED_SUFFIXES = [
  "", // Some airports just use ICAO directly
  "_Twr",
  "_App",
  "_Gnd",
  "_Del",
  "_Dep",
  "_ATIS",
  "_Ctr",
  "_1",
  "_2",
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

      // Try each suffix in parallel
      const probePromises = FEED_SUFFIXES.map(async (suffix) => {
        const feedId = `${upperIcao}${suffix}`;
        const url = `https://www.liveatc.net/hlsfeed/${feedId}.m3u8`;

        try {
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            mode: "no-cors", // LiveATC doesn't have CORS headers
          });
          // With no-cors, we can't read the response, but if it doesn't throw, it might exist
          // We'll add it as a potential feed
          return {
            name: suffix ? suffix.replace("_", " ").trim() : "Main",
            url,
          };
        } catch {
          return null;
        }
      });

      const results = await Promise.all(probePromises);

      // Since we can't verify with no-cors, add common feeds as options
      // The player will show an error if they don't work
      const commonFeeds: AtcFeed[] = [
        { name: "Tower", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_Twr.m3u8` },
        { name: "Approach", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_App.m3u8` },
        { name: "Ground", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_Gnd.m3u8` },
        { name: "Departure", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_Dep.m3u8` },
        { name: "Center", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_Ctr.m3u8` },
        { name: "ATIS", url: `https://www.liveatc.net/hlsfeed/${upperIcao}_ATIS.m3u8` },
      ];

      setFeeds(commonFeeds);
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
