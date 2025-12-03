import React from "react";

interface MetarPanelProps {
  icaoInput: string;
  onChange: (value: string) => void;
  metarText?: string | null;
  onCloseMetar: () => void;
}

export const MetarPanel: React.FC<MetarPanelProps> = ({
  icaoInput,
  onChange,
  metarText,
  onCloseMetar,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "10px",
        fontFamily: "monospace",
      }}
    >
      {metarText && (
        <div
          style={{
            position: "relative",
            background:
              "linear-gradient(145deg, rgba(0,0,0,0.85), rgba(0,20,20,0.9))",
            border: "1px solid rgba(0,255,255,0.3)",
            borderRadius: "8px",
            padding: "12px 14px",
            color: "#00ffff",
            boxShadow: "0 0 10px rgba(0,255,255,0.2)",
            maxWidth: "300px",
            wordWrap: "break-word",
          }}
        >
          <button
            onClick={onCloseMetar}
            style={{
              position: "absolute",
              top: "4px",
              right: "6px",
              border: "none",
              background: "transparent",
              color: "#00ffff",
              fontSize: "16px",
              cursor: "pointer",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgb(255,80,80)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgb(0,255,255)")
            }
            title="Close METAR"
          >
            ×
          </button>
          <strong>METAR:</strong>
          <div style={{ marginTop: "6px", fontSize: "13px", lineHeight: "1.4" }}>
            {metarText}
          </div>
        </div>
      )}

      <div
        style={{
          background: "rgba(0,0,0,0.8)",
          border: "1px solid rgba(0,255,255,0.3)",
          borderRadius: "6px",
          padding: "8px 12px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 0 6px rgba(0,255,255,0.15)",
        }}
      >
        <span style={{ color: "#00ffff", fontWeight: 500 }}>METAR</span>
        <input
          type="text"
          value={icaoInput}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="ICAO (e.g. KJFK)"
          style={{
            flex: 1,
            background: "transparent",
            border: "1px solid rgba(0,255,255,0.4)",
            color: "#00ffff",
            padding: "5px 8px",
            borderRadius: "4px",
            outline: "none",
            fontSize: "13px",
            transition: "border 0.2s, background 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = "1px solid #00ffff";
            e.currentTarget.style.background = "rgba(0,255,255,0.1)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = "1px solid rgba(0,255,255,0.4)";
            e.currentTarget.style.background = "transparent";
          }}
        />
      </div>
    </div>
  );
};