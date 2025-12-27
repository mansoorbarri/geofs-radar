import { useEffect, useRef } from "react";
import L from "leaflet";

interface UseWeatherOverlayLayerProps {
  mapInstance: React.MutableRefObject<L.Map | null>;
  isWeatherOverlayEnabled: boolean;
}

export const useWeatherOverlayLayer = ({
  mapInstance,
  isWeatherOverlayEnabled,
}: UseWeatherOverlayLayerProps) => {
  const weatherLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!mapInstance.current) return;

    if (isWeatherOverlayEnabled) {
      if (!weatherLayerRef.current) {
        weatherLayerRef.current = L.tileLayer(
          `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY}`,
          {
            maxZoom: 18,
            attribution: "Weather data © OpenWeatherMap",
            opacity: 0.9,
            zIndex: 100000,
          },
        );
      }
      weatherLayerRef.current.addTo(mapInstance.current);
    } else {
      if (weatherLayerRef.current) {
        mapInstance.current.removeLayer(weatherLayerRef.current);
        weatherLayerRef.current = null;
      }
    }

    return () => {
      if (mapInstance.current && weatherLayerRef.current) {
        mapInstance.current.removeLayer(weatherLayerRef.current);
        weatherLayerRef.current = null;
      }
    };
  }, [mapInstance, isWeatherOverlayEnabled]);
};
