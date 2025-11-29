// hooks/useAircraftStream.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { type PositionUpdate } from '~/lib/aircraft-store';

export const useAircraftStream = () => {
  const [aircrafts, setAircrafts] = useState<PositionUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected'
  >('connecting');

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connectToStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    console.log('Connecting to SSE stream...');
    setConnectionStatus('connecting');

    const eventSource = new EventSource('/api/atc/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('✓ SSE connection established');
      setConnectionStatus('connected');
      setError(null);
      reconnectAttempts.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const processedAircraft: PositionUpdate[] =
          data.aircraft?.map((ac: any) => ({
            ...ac,
            ts: ac.ts || Date.now(),
          })) || [];

        setAircrafts(processedAircraft);
        setIsLoading(false);
        setError(null);
      } catch (e) {
        console.error('Error parsing SSE data:', e);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE connection error');
      setConnectionStatus('disconnected');
      eventSource.close();

      const backoffTime = Math.min(
        1000 * Math.pow(2, reconnectAttempts.current),
        30000
      );
      reconnectAttempts.current++;

      setError(`Connection lost. Reconnecting in ${backoffTime / 1000}s...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`Reconnect attempt #${reconnectAttempts.current}`);
        connectToStream();
      }, backoffTime);
    };
  }, []);

  useEffect(() => {
    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectToStream]);

  return { aircrafts, isLoading, error, connectionStatus };
};