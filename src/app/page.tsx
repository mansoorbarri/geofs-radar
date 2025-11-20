'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { type PositionUpdate } from '~/lib/aircraft-store';
import { useViewerTracker } from '~/hooks/use-viewer-counter';

interface Airport {
    name: string;
    lat: number;
    lon: number;
    icao: string;
}

type AirportMap = Record<string, Airport>;

const DynamicMapComponent = dynamic(
  () => import('~/components/map'),
  { 
    ssr: false,
    loading: () => <div style={{ textAlign: 'center', paddingTop: '50px' }}>Loading Map...</div>
  }
);

const Sidebar = React.memo(({ aircraft }: { aircraft: PositionUpdate & { altMSL?: number } }) => {
    const altMSL = aircraft.altMSL ?? aircraft.alt;
    const altAGL = aircraft.alt;

    const renderFlightPlan = useCallback(() => {
        if (!aircraft.flightPlan) return <p>Flight plan unavailable.</p>;

        try {
            const waypoints = JSON.parse(aircraft.flightPlan);
            return (
                <div style={{ maxHeight: 'calc(100% - 200px)', overflowY: 'auto', paddingRight: '10px', paddingBottom: '20px' }}>
                    <h3 style={{ borderBottom: '1px solid #444', paddingBottom: '5px', fontSize: '16px', marginTop: '15px' }}>Route Details</h3>
                    {waypoints.map((wp: any, index: number) => (
                        <div key={index} style={{ padding: '5px 0', borderBottom: index < waypoints.length - 1 ? '1px dashed #333' : 'none' }}>
                            <strong>{wp.ident}</strong> ({wp.type})
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>
                                Alt: {wp.alt ? wp.alt + ' ft' : 'N/A'} | Spd: {wp.spd ? wp.spd + ' kt' : 'N/A'}
                            </div>
                        </div>
                    ))}
                </div>
            );
        } catch (e) {
            return <p>Error loading flight plan data.</p>;
        }
    }, [aircraft.flightPlan]);

    return (
        <div style={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            width: '350px', 
            height: '100%', 
            backgroundColor: 'rgba(22, 27, 34, 0.95)', 
            boxShadow: '-2px 0 10px rgba(0,0,0,0.5)',
            color: '#fff', 
            zIndex: 1000, 
            display: 'flex',
            flexDirection: 'column',
            padding: '10px', 
        }}>
            <div style={{ 
                backgroundColor: 'transparent', 
                padding: '0 0 10px 0', 
                borderBottom: '1px solid #444'
            }}>
                <h2 style={{ margin: 0 }}>{aircraft.callsign || aircraft.flightNo || 'N/A'}</h2>
                <p style={{ opacity: 0.7, margin: '5px 0 0 0', fontSize: '14px' }}>{aircraft.type || 'Unknown Type'}</p>
            </div>
            
            <div style={{ padding: '0 0 0 0', flexGrow: 1, overflowY: 'auto' }}>
                
                <div style={{ marginBottom: '15px', paddingTop: '10px' }}>
                    <p><strong>CALLSIGN:</strong> {aircraft.flightNo || 'N/A'}</p>
                    <p><strong>FROM:</strong> {aircraft.departure || 'N/A'} <strong>TO:</strong> {aircraft.arrival || 'N/A'}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '15px', padding: '10px', border: '1px solid #333', borderRadius: '5px', backgroundColor: 'rgba(33, 37, 41, 0.5)' }}>
                    <div><strong>Altitude MSL:</strong> {altMSL?.toFixed(0) || "0"} ft</div>
                    <div><strong>Altitude AGL:</strong> {altAGL?.toFixed(0) || "0"} ft</div>
                    <div><strong>V-Speed:</strong> {aircraft.vspeed || "0"} ft/min</div>
                    <div><strong>Speed:</strong> {aircraft.speed?.toFixed(0)} kt</div>
                    <div><strong>Heading:</strong> {aircraft.heading?.toFixed(0)}°</div>
                    <div><strong>Squawk:</strong> {aircraft.squawk || 'N/A'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Next Waypoint:</strong> {aircraft.nextWaypoint || ''}</div>
                </div>

                {renderFlightPlan()}
            </div>
        </div>
    );
});

Sidebar.displayName = 'Sidebar';

export default function ATCPage() {
  const [aircrafts, setAircrafts] = useState<PositionUpdate[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [selectedAircraft, setSelectedAircraft] = useState<PositionUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  
  useViewerTracker({ enabled: true });

  const handleAircraftSelect = useCallback((aircraft: PositionUpdate | null) => {
    setSelectedAircraft(aircraft);
  }, []);

  const fetchAirports = useCallback(async () => {
    try {
      const response = await fetch('/airports.json');
      const airportMap: AirportMap = await response.json();
      const airportArray: Airport[] = Object.values(airportMap);
      setAirports(airportArray);
    } catch (e) {
      console.warn("Could not load airports.json");
    }
  }, []);

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
        
        const processedAircraft: PositionUpdate[] = data.aircraft?.map((ac: any) => ({
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
    fetchAirports();
    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [fetchAirports, connectToStream]);

  useEffect(() => {
    if (selectedAircraft && aircrafts.length > 0) {
      const updatedAircraft = aircrafts.find(
        (ac) => ac.callsign === selectedAircraft.callsign || ac.flightNo === selectedAircraft.flightNo
      );

      if (updatedAircraft) {
        setSelectedAircraft(updatedAircraft);
      } else {
        setSelectedAircraft(null);
      }
    }
  }, [aircrafts, selectedAircraft]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 10000,
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        backgroundColor: connectionStatus === 'connected' 
          ? 'rgba(16, 185, 129, 0.9)' 
          : connectionStatus === 'connecting'
          ? 'rgba(251, 191, 36, 0.9)'
          : 'rgba(239, 68, 68, 0.9)',
        color: 'white',
        fontWeight: 'bold',
      }}>
        {connectionStatus === 'connected' && '● Live'}
        {connectionStatus === 'connecting' && '◐ Connecting...'}
        {connectionStatus === 'disconnected' && '○ Disconnected'}
      </div>

      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        {isLoading && aircrafts.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '50px', background: '#333', color: '#fff' }}>Loading initial data...</div>
        ) : (
          <DynamicMapComponent 
            aircrafts={aircrafts} 
            airports={airports} 
            onAircraftSelect={handleAircraftSelect}
          />
        )}
      </div>

      <div style={{
        transform: selectedAircraft ? 'translateX(0)' : 'translateX(300px)',
        transition: 'transform 0.3s ease',
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 99997,
        width: '300px',
        height: '100%',
      }}>
        {selectedAircraft && <Sidebar aircraft={selectedAircraft} />}
      </div>

    </div>
  );
}