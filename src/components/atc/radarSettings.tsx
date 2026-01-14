"use client";

import React from "react";
import { Switch } from "~/components/ui/switch";

interface RadarSettingsProps {
  isPRO: boolean;

  showPrecipitation: boolean;
  setShowPrecipitation: (v: boolean) => void;

  showAirmets: boolean;
  setShowAirmets: (v: boolean) => void;

  showSigmets: boolean;
  setShowSigmets: (v: boolean) => void;
}

export const RadarSettings = ({
  isPRO,
  showPrecipitation,
  setShowPrecipitation,
  showAirmets,
  setShowAirmets,
  showSigmets,
  setShowSigmets,
}: RadarSettingsProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-cyan-400/30 bg-black/90 p-4 font-mono text-cyan-400 shadow-xl backdrop-blur-md">
      <h3 className="text-[14px] font-bold tracking-widest text-white uppercase">
        RADAR CONFIGURATION
      </h3>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <span className="text-[11px] tracking-widest text-cyan-300 uppercase">
          WEATHER LAYERS
        </span>

        <SettingsToggle
          label="Precipitation"
          checked={showPrecipitation}
          onChange={setShowPrecipitation}
        />

        <SettingsToggle
          label="AIRMETs"
          checked={showAirmets}
          onChange={setShowAirmets}
          disabled={!isPRO}
        />

        <SettingsToggle
          label="SIGMETs"
          checked={showSigmets}
          onChange={setShowSigmets}
          disabled={!isPRO}
        />
      </div>
    </div>
  );
};

function SettingsToggle({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center justify-between text-sm ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <span>
        {label}
        {disabled && (
          <span className="ml-2 text-[10px] text-yellow-500 uppercase">
            PRO
          </span>
        )}
      </span>

      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-gray-600"
      />
    </label>
  );
}
