import React, { useEffect, useState, useCallback, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type PositionUpdate } from "~/lib/aircraft-store";
import { useMapInitialization } from "./useMapInitialization";
import { useFlightPlanDrawing } from "./useFlightPlanDrawing";
import { useMapLayersAndMarkers } from "./useMapLayersAndMarkers";
import { useSelectedAirportHandling } from "./useSelectedAirportHandling";
import { useHeadingModeInteraction } from "./useHeadingModeInteraction";
import {
  HeadingModeControl,
  RadarModeControl,
  OpenAIPControl,
  WeatherOverlayControl,
} from "~/components/map/MapControls";
import { MapGlobalStyles } from "~/styles/MapGlobalStyles";
import { useMetarOverlay } from "~/hooks/useMetarOverlay";
import { useWeatherOverlayLayer } from "~/hooks/useWeatherOverlayLayer";
import { MetarPanel } from "./MetarPanel";

export interface Airport {
  name: string;
  lat: number;
  lon: string;
  icao: string;
  frequencies?: { type: string; frequency: string }[];
}

interface MapComponentProps {
  aircrafts: PositionUpdate[];
  airports: Airport[];
  onAircraftSelect: (aircraft: PositionUpdate | null) => void;
  selectedWaypointIndex?: number | null;
  selectedAirport?: Airport | undefined;
  setDrawFlightPlanOnMap: (
    func: (aircraft: PositionUpdate, shouldZoom?: boolean) => void,
  ) => void;
  onMapReady?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  aircrafts,
  airports,
  onAircraftSelect,
  selectedAirport,
  setDrawFlightPlanOnMap,
}) => {
  const [isHeadingMode, setIsHeadingMode] = useState(false);
  const [isRadarMode, setIsRadarMode] = useState(false);
  const [isOpenAIPEnabled, setIsOpenAIPEnabled] = useState(false);
  const [isWeatherOverlayEnabled, setIsWeatherOverlayEnabled] = useState(false);
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    null,
  );
  const [icaoInput, setIcaoInput] = useState("");
  const [showMetar, setShowMetar] = useState(true);

  const headingControlRef = useRef<HeadingModeControl | null>(null);
  const radarControlRef = useRef<RadarModeControl | null>(null);
  const openAIPControlRef = useRef<OpenAIPControl | null>(null);
  const weatherControlRef = useRef<WeatherOverlayControl | null>(null);

  const onAircraftSelectRef = useRef(onAircraftSelect);
  useEffect(() => {
    onAircraftSelectRef.current = onAircraftSelect;
  }, [onAircraftSelect]);

  // Pass a *truly* static empty function to useMapInitialization.
  // The actual click handler will be attached later in a separate useEffect.
  const mapRefs = useMapInitialization({
    mapContainerId: "map-container",
    setIsHeadingMode,
    setIsRadarMode,
    setIsOpenAIPEnabled,
    setIsWeatherOverlayEnabled,
    onMapClick: useCallback((e: L.LeafletMouseEvent) => {}, []), // <--- CRITICAL: Stable empty function for initial map setup
    setHeadingControlRef: headingControlRef,
    setRadarControlRef: radarControlRef,
    setOpenAIPControlRef: openAIPControlRef,
    setWeatherControlRef: weatherControlRef,
  });

  const { drawFlightPlan, currentSelectedAircraftRef } = useFlightPlanDrawing({
    mapInstance: mapRefs.mapInstance,
    flightPlanLayerGroup: mapRefs.flightPlanLayerGroup,
    historyLayerGroup: mapRefs.historyLayerGroup,
    isRadarMode,
    onAircraftSelect: onAircraftSelectRef.current,
    setSelectedAircraftId,
  });

  // The actual map click handler, now completely independent of initial map creation
  const stableOnMapClick = useCallback(
    (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      if (
        !target.closest(".leaflet-marker-icon") &&
        !target.closest(".leaflet-popup-pane") &&
        !target.closest(".leaflet-control") &&
        mapRefs.flightPlanLayerGroup.current &&
        mapRefs.historyLayerGroup.current
      ) {
        mapRefs.flightPlanLayerGroup.current.clearLayers();
        mapRefs.historyLayerGroup.current.clearLayers();
        currentSelectedAircraftRef.current = null;
        setSelectedAircraftId(null);
        onAircraftSelectRef.current(null); // Access via ref
      }
    },
    [setSelectedAircraftId, currentSelectedAircraftRef],
  );

  // This useEffect *attaches* the actual click handler AFTER the map has been created
  useEffect(() => {
    if (mapRefs.mapInstance.current) {
      // Clean up any previously attached (empty) click handler from initial setup
      // and attach the truly stable one.
      // This will only run once after initial map creation.
      mapRefs.mapInstance.current.off("click"); // Remove any placeholder handler
      mapRefs.mapInstance.current.on("click", stableOnMapClick);
    }
    // Cleanup for when component unmounts
    return () => {
      if (mapRefs.mapInstance.current) {
        mapRefs.mapInstance.current.off("click", stableOnMapClick);
      }
    };
  }, [mapRefs.mapInstance, stableOnMapClick]); // mapRefs.mapInstance (the ref) and stableOnMapClick are stable.


  useMapLayersAndMarkers({
    mapInstance: mapRefs.mapInstance,
    aircraftMarkersLayer: mapRefs.aircraftMarkersLayer,
    airportMarkersLayer: mapRefs.airportMarkersLayer,
    satelliteHybridLayer: mapRefs.satelliteHybridLayer,
    radarBaseLayer: mapRefs.radarBaseLayer,
    openAIPLayer: mapRefs.openAIPLayer,
    aircrafts,
    airports,
    isRadarMode,
    isOpenAIPEnabled,
    selectedAircraftId,
    currentSelectedAircraftRef,
    drawFlightPlan,
    onAircraftSelect: onAircraftSelectRef.current,
  });

  useSelectedAirportHandling({
    mapInstance: mapRefs.mapInstance,
    selectedAirport,
    isRadarMode,
  });

  useHeadingModeInteraction({
    mapInstance: mapRefs.mapInstance,
    isHeadingMode,
    isRadarMode,
  });

  useWeatherOverlayLayer({
    mapInstance: mapRefs.mapInstance,
    isWeatherOverlayEnabled,
  });

  useEffect(() => {
    if (headingControlRef.current)
      headingControlRef.current.updateState(isHeadingMode);
    if (radarControlRef.current)
      radarControlRef.current.updateState(isRadarMode);
    if (openAIPControlRef.current)
      openAIPControlRef.current.updateState(isOpenAIPEnabled);
    if (weatherControlRef.current)
      weatherControlRef.current.updateState(isWeatherOverlayEnabled);
  }, [isHeadingMode, isRadarMode, isOpenAIPEnabled, isWeatherOverlayEnabled]);

  useEffect(() => {
    setDrawFlightPlanOnMap(drawFlightPlan);
  }, [drawFlightPlan, setDrawFlightPlanOnMap]);

  const metar = useMetarOverlay(
    mapRefs.mapInstance,
    icaoInput || selectedAirport?.icao,
  );

  return (
    <>
      <MapGlobalStyles />
      <div id="map-container" style={{ height: "100%", width: "100%" }} />

      <MetarPanel
        icaoInput={icaoInput}
        onChange={setIcaoInput}
        metarText={showMetar && metar?.raw ? metar.raw : null}
        onCloseMetar={() => setShowMetar(false)}
      />
    </>
  );
};

export default MapComponent;