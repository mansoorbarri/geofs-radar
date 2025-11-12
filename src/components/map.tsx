// components/MapComponent.tsx
import React, { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type PositionUpdate } from '~/lib/aircraft-store';

interface PositionUpdate {
  id: string;
  callsign: string;
  type: string;
  lat: number;
  lon: number;
  alt: number;
  heading: number;
  speed: number;
  arrival: string;
  ts: number;
  flightNo: string;
  departure: string;
  squawk: string;
}

interface MapComponentProps {
  aircrafts: PositionUpdate[];
  airports: Airport[];
}

interface Airport {
    name: string;
    lat: number;
    lon: number;
    icao: string;
}

let mapInstance: L.Map | null = null;
let isInitialLoad = true; 

// NEW ICON FUNCTION: Uses L.divIcon to create both the rotating icon and the persistent label
const getAircraftDivIcon = (aircraft: PositionUpdate) => {
  const iconUrl = 'https://i.ibb.co/6cNhyMMj/1.png'; 
  const planeSize = 30; 
  const tagHeight = 45; // Adjusted height for new font size/padding
  const tagWidth = 140; // Adjusted width for more details

  // Tag styling: Black BG, 40% opacity (default), rounded corners
  const tagStyle = `
    position: absolute;
    bottom: -${tagHeight - 5}px;
    left: 50%;
    transform: translateX(-50%);
    width: ${tagWidth}px;
    padding: 4px 6px;
    margin-top: 10px;
    background-color: rgba(0, 0, 0, 0.4); /* Default 40% opacity */
    color: #fff;
    border-radius: 4px; /* Slightly more rounded */
    white-space: normal;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0,0,0,0.6);
    line-height: 1.3;
    z-index: 1000;
    pointer-events: none; /* Prevents tag from blocking map interaction */
  `;
  
  const containerStyle = `
    position: relative;
    width: ${planeSize}px;
    height: ${planeSize}px;
  `;

  // HTML content for the multi-line tag with increased font size
  const detailContent = `
    <div style="font-size: 12px; font-weight: bold; color: #fff;">
      ${aircraft.callsign || aircraft.flightNo || 'N/A'} (FLT: ${aircraft.flightNo || 'N/A'})
    </div>
    <div style="font-size: 10px; opacity: 0.9;">
      ${aircraft.alt.toFixed(0)}ft | HDG ${aircraft.heading.toFixed(0)}° | ${aircraft.speed.toFixed(0)}kt
    </div>
    <div style="font-size: 10px; opacity: 0.8;">
      SQK: ${aircraft.squawk || 'N/A'} | ${aircraft.departure || 'UNK'} → ${aircraft.arrival || 'UNK'}
    </div>
  `;

  return L.divIcon({
    html: `
      <div style="${containerStyle}" class="aircraft-marker-container">
        <img src="${iconUrl}" 
             style="width:${planeSize}px; height:${planeSize}px; transform:rotate(${aircraft.heading || 0}deg); display: block;" 
             alt="${aircraft.callsign}"
        />
        <div class="aircraft-tag" style="${tagStyle}">
          ${detailContent}
        </div>
      </div>
    `,
    className: 'leaflet-aircraft-icon',
    iconSize: [tagWidth, planeSize + tagHeight], 
    iconAnchor: [tagWidth / 2, planeSize / 2],
    popupAnchor: [0, -15]
  });
};

const AirportIcon = L.icon({
    iconUrl: 'https://i0.wp.com/microshare.io/wp-content/uploads/2024/04/airport2-icon.png?resize=510%2C510&ssl=1',
    iconSize: [30, 30],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
});

const MapComponent: React.FC<MapComponentProps> = ({ aircrafts, airports }) => {
  
  useEffect(() => {
    if (!mapInstance) {
      mapInstance = L.map('map-container', {
        zoomAnimation: true, 
      }).setView([20, 0], 2);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Tiles &copy; Esri',
          maxZoom: 18,
          pane: 'tilePane',
      }).addTo(mapInstance);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Esri, Garmin, FAO, USGS, NPS',
          maxZoom: 18,
          transparent: true,
          pane: 'overlayPane',
      }).addTo(mapInstance);
    }
    
    mapInstance.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            mapInstance?.removeLayer(layer);
        }
    });

    airports.forEach(airport => {
        const popupContent = `**Airport:** ${airport.name}<br>(${airport.icao})`;
        
        L.marker([airport.lat, airport.lon], {
            title: airport.name,
            icon: AirportIcon,
        }).addTo(mapInstance!)
          .bindPopup(popupContent);
    });

    aircrafts.forEach(aircraft => {
      const icon = getAircraftDivIcon(aircraft);

      L.marker([aircraft.lat, aircraft.lon], {
        title: aircraft.callsign,
        icon: icon,
      }).addTo(mapInstance!);
    });

    isInitialLoad = false;
  }, [aircrafts, airports]); 

  return <div id="map-container" style={{ height: '100%', width: '100%' }} />;
};

export default MapComponent;