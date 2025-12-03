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
} from "./MapControls";
import { MapGlobalStyles } from "~/styles/MapGlobalStyles";
import { useMetarOverlay } from "~/hooks/useMetarOverlay";
import { MetarPanel } from "./MetarPanel";

export interface Airport {
  name: string;
  lat: number;
  lon: number;
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
  const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(
    null,
  );
  const [icaoInput, setIcaoInput] = useState("");
  const [showMetar, setShowMetar] = useState(true);

  const headingControlRef = useRef<HeadingModeControl | null>(null);
  const radarControlRef = useRef<RadarModeControl | null>(null);
  const openAIPControlRef = useRef<OpenAIPControl | null>(null);

  const mapRefs = useMapInitialization({
    mapContainerId: "map-container",
    setIsHeadingMode,
    setIsRadarMode,
    setIsOpenAIPEnabled,
    onMapClick: (e: L.LeafletMouseEvent) => {
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
      }
    },
    setHeadingControlRef: headingControlRef,
    setRadarControlRef: radarControlRef,
    setOpenAIPControlRef: openAIPControlRef,
  });

  const { drawFlightPlan, currentSelectedAircraftRef } = useFlightPlanDrawing({
    mapInstance: mapRefs.mapInstance,
    flightPlanLayerGroup: mapRefs.flightPlanLayerGroup,
    historyLayerGroup: mapRefs.historyLayerGroup,
    isRadarMode,
    onAircraftSelect,
    setSelectedAircraftId,
  });

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
        onAircraftSelect(null);
      }
    },
    [
      onAircraftSelect,
      mapRefs,
      currentSelectedAircraftRef,
      setSelectedAircraftId,
    ],
  );

  useEffect(() => {
    if (mapRefs.mapInstance.current) {
      mapRefs.mapInstance.current.off("click");
      mapRefs.mapInstance.current.on("click", stableOnMapClick);
    }
    return () => {
      if (mapRefs.mapInstance.current) {
        mapRefs.mapInstance.current.off("click", stableOnMapClick);
      }
    };
  }, [mapRefs.mapInstance, stableOnMapClick]);

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
    onAircraftSelect,
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

  useEffect(() => {
    if (headingControlRef.current)
      headingControlRef.current.updateState(isHeadingMode);
    if (radarControlRef.current)
      radarControlRef.current.updateState(isRadarMode);
    if (openAIPControlRef.current)
      openAIPControlRef.current.updateState(isOpenAIPEnabled);
  }, [isHeadingMode, isRadarMode, isOpenAIPEnabled]);

  useEffect(() => {
    setDrawFlightPlanOnMap(drawFlightPlan);
  }, [drawFlightPlan, setDrawFlightPlanOnMap]);

  // Use your actual hook
  const metar = useMetarOverlay(mapRefs.mapInstance, icaoInput || selectedAirport?.icao);

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