import { useEffect, useRef } from "react";
import L from "leaflet";

interface UseWeatherOverlayLayerProps {
  mapInstance: React.MutableRefObject<L.Map | null>;
  showPrecipitation: boolean;
  showAirmets: boolean;
  showSigmets: boolean;
}

export const useWeatherOverlayLayer = ({
  mapInstance,
  showPrecipitation,
  showAirmets,
  showSigmets,
}: UseWeatherOverlayLayerProps) => {
  const precipLayerRef = useRef<L.TileLayer | null>(null);
  const airmetLayerRef = useRef<L.GeoJSON | null>(null);
  const sigmetLayerRef = useRef<L.GeoJSON | null>(null);
  const isigmetLayerRef = useRef<L.GeoJSON | null>(null);

  /* -------------------------------
   * Precipitation (Raster)
   * ------------------------------- */
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    if (showPrecipitation) {
      if (!precipLayerRef.current) {
        precipLayerRef.current = L.tileLayer(
          `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY}`,
          {
            opacity: 0.8,
            zIndex: 200,
            attribution: "Weather © OpenWeatherMap",
          },
        );
      }
      precipLayerRef.current.addTo(map);
    } else if (precipLayerRef.current) {
      map.removeLayer(precipLayerRef.current);
      precipLayerRef.current = null;
    }
  }, [mapInstance, showPrecipitation]);

  /* -------------------------------
   * AIRMET / SIGMET / ISIGMET
   * ------------------------------- */
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    const styleForHazard = (hazard?: string): L.PathOptions => {
      switch (hazard) {
        case "TURB":
          return { color: "#facc15", weight: 2, fillOpacity: 0.18 };
        case "ICE":
          return { color: "#38bdf8", weight: 2, fillOpacity: 0.18 };
        case "TS":
          return { color: "#ef4444", weight: 2, fillOpacity: 0.22 };
        case "MTW":
          return { color: "#a855f7", weight: 2, fillOpacity: 0.18 };
        default:
          return { color: "#94a3b8", weight: 2, fillOpacity: 0.12 };
      }
    };

    const bindPopup = (feature: any, layer: L.Layer) => {
      const p = feature.properties || {};
      layer.bindPopup(`
        <strong>${p.hazard || "Advisory"}</strong><br/>
        ${p.raw_text || ""}<br/><br/>
        <strong>Alt:</strong> ${p.altitude || "N/A"}<br/>
        <strong>Valid:</strong> ${p.valid_from || "?"} → ${p.valid_to || "?"}
      `);
    };

    const loadLayer = async (
      url: string,
      ref: React.MutableRefObject<L.GeoJSON | null>,
      zIndex: number,
    ) => {
      const res = await fetch(url);
      const geojson = await res.json();

      ref.current = L.geoJSON(geojson, {
        style: (f) => styleForHazard(f?.properties?.hazard),
        onEachFeature: bindPopup,
      });

      ref.current.setZIndex(zIndex);
      ref.current.addTo(map);
    };

    if (showAirmets && !airmetLayerRef.current) {
      loadLayer("/api/weather/airmets", airmetLayerRef, 400);
    }
    if (!showAirmets && airmetLayerRef.current) {
      map.removeLayer(airmetLayerRef.current);
      airmetLayerRef.current = null;
    }

    if (showSigmets && !sigmetLayerRef.current) {
      loadLayer("/api/weather/sigmets", sigmetLayerRef, 600);
    }
    if (!showSigmets && sigmetLayerRef.current) {
      map.removeLayer(sigmetLayerRef.current);
      sigmetLayerRef.current = null;
    }

    if (showSigmets && !isigmetLayerRef.current) {
      loadLayer("/api/weather/isigmets", isigmetLayerRef, 650);
    }
    if (!showSigmets && isigmetLayerRef.current) {
      map.removeLayer(isigmetLayerRef.current);
      isigmetLayerRef.current = null;
    }

    return () => {
      [airmetLayerRef, sigmetLayerRef, isigmetLayerRef].forEach((ref) => {
        if (ref.current) {
          map.removeLayer(ref.current);
          ref.current = null;
        }
      });
    };
  }, [mapInstance, showAirmets, showSigmets]);
};
