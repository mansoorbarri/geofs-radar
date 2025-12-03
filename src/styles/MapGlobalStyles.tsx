import React from "react";

export const MapGlobalStyles = () => (
  <style jsx global>{`
    .heading-tooltip {
      background-color: rgba(0, 0, 0, 0.7) !important;
      color: white !important;
      border: none !important;
      border-radius: 4px !important;
      padding: 8px !important;
      font-size: 12px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
      pointer-events: none !important;
    }
    .heading-tooltip::before {
      display: none !important;
    }

    .leaflet-popup-content-wrapper {
      background-color: rgba(0, 0, 0, 0.9) !important;
      color: #00ffff !important;
      border-radius: 8px !important;
    }
    .leaflet-popup-tip {
      background-color: rgba(0, 0, 0, 0.9) !important;
    }

    .radar-popup .leaflet-popup-content-wrapper {
      background-color: rgba(0, 0, 0, 0.8) !important;
      color: #00ff00 !important;
      border: 1px solid #00ff00 !important;
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5) !important;
    }
    .radar-popup .leaflet-popup-tip {
      background-color: rgba(0, 0, 0, 0.8) !important;
      border-top: 1px solid #00ff00 !important;
      border-left: 1px solid transparent !important;
      border-right: 1px solid transparent !important;
    }

    @keyframes emergency-plane-pulse {
      0% {
        box-shadow: 0 0 10px #ff0000, 0 0 20px #ff0000;
      }
      100% {
        box-shadow: 0 0 15px #ff0000, 0 0 25px #ff0000, 0 0 30px #ff0000;
      }
    }

    @keyframes radar-emergency-pulse {
      0% {
        transform: scale(1);
        box-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
      }
      50% {
        transform: scale(1.3);
        box-shadow: 0 0 10px rgba(255, 0, 0, 0.9);
      }
      100% {
        transform: scale(1);
        box-shadow: 0 0 5px rgba(255, 0, 0, 0.7);
      }
    }
  `}</style>
);