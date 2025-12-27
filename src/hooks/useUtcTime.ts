import { useState, useEffect } from "react";

export function useUtcTime(): string {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const utcPart = now.toUTCString().split(" ")[4] ?? "";

      setTime(utcPart);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);

  return time;
}
