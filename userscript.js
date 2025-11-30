(function () {
  "use strict";

  const API_URL = "https://radar.xyzmani.com/api/atc/position";
  const CF_API_URL =
    "https://geofs-radar.mansoor-eb-ak.workers.dev/api/atc/position";
  const SEND_INTERVAL_MS = 5000;

  const UI_CONTAINER_ID = "geofs-atc-radar-flightInfoUI";
  const DEP_INPUT_ID = "atc-depInput";
  const ARR_INPUT_ID = "atc-arrInput";
  const FLT_INPUT_ID = "atc-fltInput";
  const SQK_INPUT_ID = "atc-sqkInput";
  const SAVE_BTN_ID = "atc-saveBtn";
  const CLEAR_BTN_ID = "atc-clearBtn";
  const STATUS_INDICATOR_ID = "atc-statusIndicator";

  let flightInfo = { departure: "", arrival: "", flightNo: "", squawk: "" };
  let flightUI;
  let wasOnGround = true;
  let takeoffTimeUTC = "";
  let isConnected = false;
  let isFlightInfoSaved = false;
  let hasActiveViewers = true;

  function log(...args) {
    console.log("[ATC-Reporter]", ...args);
  }

  async function sendToAPI(payload, apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn("[ATC-Reporter] API error:", response.status);
        isConnected = false;
        return false;
      }

      if (!isConnected) {
        log("API connected");
        isConnected = true;
      }

      return true;
    } catch (error) {
      if (isConnected) {
        console.warn("[ATC-Reporter] API connection error:", error);
        isConnected = false;
      }
      return false;
    }
  }

  function getAircraftName() {
    return geofs?.aircraft?.instance?.aircraftRecord?.name || "Unknown";
  }

  function getPlayerCallsign() {
    return geofs?.userRecord?.callsign || "Unknown";
  }

  function validateSquawk(squawk) {
    const rgx = /^[0-7]{4}$/;
    return squawk.length === 0 || rgx.test(squawk);
  }

  function calculateAGL() {
    try {
      const altitudeMSL = geofs?.animation?.values?.altitude;
      const groundElevationFeet = geofs?.animation?.values?.groundElevationFeet;
      const aircraft = geofs?.aircraft?.instance;

      if (
        typeof altitudeMSL === "number" &&
        typeof groundElevationFeet === "number" &&
        aircraft?.collisionPoints?.length >= 2 &&
        typeof aircraft.collisionPoints[aircraft.collisionPoints.length - 2]
          ?.worldPosition?.[2] === "number"
      ) {
        const collisionZFeet =
          aircraft.collisionPoints[aircraft.collisionPoints.length - 2]
            .worldPosition[2] * 3.2808399;
        return Math.round(altitudeMSL - groundElevationFeet + collisionZFeet);
      }
    } catch (err) {
      console.warn("[ATC-Reporter] AGL calculation error:", err);
    }
    return null;
  }

  function checkTakeoff() {
    const onGround = geofs?.aircraft?.instance?.groundContact ?? true;
    if (wasOnGround && !onGround) {
      takeoffTimeUTC = new Date().toISOString();
      console.log("[ATC-Reporter] Takeoff at", takeoffTimeUTC);
    }
    wasOnGround = onGround;
  }

  function readSnapshot() {
    try {
      const inst = geofs?.aircraft?.instance;
      if (!inst) return null;

      const lla = inst.llaLocation || [];
      const lat = lla[0];
      const lon = lla[1];
      const altMeters = lla[2];

      if (typeof lat !== "number" || typeof lon !== "number") return null;

      const altMSL =
        typeof altMeters === "number"
          ? altMeters * 3.28084
          : (geofs?.animation?.values?.altitude ?? 0);
      const altAGL = calculateAGL();
      const heading = geofs?.animation?.values?.heading360 ?? 0;
      const speed = geofs.animation.values.kias
        ? geofs.animation.values.kias.toFixed(1)
        : "N/A";

      return { lat, lon, altMSL, altAGL, heading, speed };
    } catch (e) {
      console.warn("[ATC-Reporter] readSnapshot error:", e);
      return null;
    }
  }

  function buildPayload(snap) {
    checkTakeoff();
    let flightPlan = [];

    try {
      if (geofs.flightPlan && typeof geofs.flightPlan.export === "function") {
        flightPlan = geofs.flightPlan.export();
      }
    } catch (e) {
      console.error("[ATC-Reporter] Error in buildPayload/FlightPlan:", e);
    }

    return {
      id: getPlayerCallsign(),
      callsign: getPlayerCallsign(),
      type: getAircraftName(),
      lat: snap.lat,
      lon: snap.lon,
      alt:
        typeof snap.altAGL === "number"
          ? snap.altAGL
          : Math.round(snap.altMSL || 0),
      altMSL: Math.round(snap.altMSL || 0),
      heading: Math.round(snap.heading || 0),
      speed: Math.round(snap.speed || 0),
      flightNo: flightInfo.flightNo,
      departure: flightInfo.departure,
      arrival: flightInfo.arrival,
      takeoffTime: takeoffTimeUTC,
      squawk: flightInfo.squawk,
      flightPlan: flightPlan,
      nextWaypoint: geofs.flightPlan?.trackedWaypoint?.ident || null,
      vspeed: Math.floor(geofs.animation?.values?.verticalSpeed || 0),
    };
  }

  function isFlightInfoComplete() {
    return (
      flightInfo.departure.trim() !== "" &&
      flightInfo.arrival.trim() !== "" &&
      flightInfo.flightNo.trim() !== ""
    );
  }

  function clearAllData() {
    flightInfo = { departure: "", arrival: "", flightNo: "", squawk: "" };
    isFlightInfoSaved = false;
    takeoffTimeUTC = "";

    document.getElementById(DEP_INPUT_ID).value = "";
    document.getElementById(ARR_INPUT_ID).value = "";
    document.getElementById(FLT_INPUT_ID).value = "";
    document.getElementById(SQK_INPUT_ID).value = "";

    updateStatus();
  }

  setInterval(async () => {
    if (!isFlightInfoSaved || !isFlightInfoComplete()) {
      return;
    }

    hasActiveViewers = true;
    updateStatus();

    const snap = readSnapshot();
    if (!snap) return;
    const payload = buildPayload(snap);
    +(await sendToAPI(payload, API_URL));
    +(await sendToAPI(payload, CF_API_URL));
  }, SEND_INTERVAL_MS);

  function showToast(msg, isError = false) {
    const toast = document.createElement("div");
    toast.textContent = msg;
    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.background = isError
      ? "rgba(220,53,69,0.9)"
      : "rgba(40,167,69,0.9)";
    toast.style.color = "#fff";
    toast.style.padding = "12px 16px";
    toast.style.borderRadius = "8px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "500";
    toast.style.zIndex = 1000000;
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    toast.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
    });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
function injectFlightUI() {
  flightUI = document.createElement("div");
  flightUI.id = UI_CONTAINER_ID;
  flightUI.style.cssText = `
    position: fixed;
    top: 60px;
    right: 15px;
    background: rgba(35, 42, 49, 0.75);
    backdrop-filter: blur(14px) saturate(180%);
    border-radius: 14px;
    color: #f1f2f6;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12px;
    padding: 16px;
    padding-right: 25px
    width: 230px;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 28px rgba(0,0,0,0.35);
    transition: transform 0.2s ease, box-shadow 0.3s ease;
    z-index: 999999;
  `;
  flightUI.onmouseenter = () => {
    flightUI.style.transform = "translateY(-2px)";
    flightUI.style.boxShadow = "0 10px 32px rgba(0,0,0,0.45)";
  };
  flightUI.onmouseleave = () => {
    flightUI.style.transform = "translateY(0)";
    flightUI.style.boxShadow = "0 8px 28px rgba(0,0,0,0.35)";
  };

  flightUI.innerHTML = `
    <div style="text-align:center; margin-bottom: 12px; font-weight:600; font-size:14px; letter-spacing:0.5px; color:#74b9ff;">
      ATC Flight Information
    </div>

    <div style="display: grid; gap: 8px;">
      ${buildInputRow("Departure", DEP_INPUT_ID, "ICAO")}
      ${buildInputRow("Arrival", ARR_INPUT_ID, "ICAO")}
      ${buildInputRow("Callsign", FLT_INPUT_ID, "ABC123")}
      ${buildInputRow("Squawk", SQK_INPUT_ID, "7000")}
    </div>

    <div style="display:flex; gap:8px; margin-top:14px;">
      <button id="${SAVE_BTN_ID}" style="
        flex:1;
        padding:8px 0;
        background:linear-gradient(135deg,#00b894,#00cec9);
        color:white;
        border:none;
        border-radius:8px;
        font-weight:600;
        font-size:12px;
        cursor:pointer;
        transition:all 0.25s;
      ">Save</button>

      <button id="${CLEAR_BTN_ID}" style="
        flex:1;
        padding:8px 0;
        background:linear-gradient(135deg,#d63031,#e17055);
        color:white;
        border:none;
        border-radius:8px;
        font-weight:600;
        font-size:12px;
        cursor:pointer;
        transition:all 0.25s;
      ">Clear</button>
    </div>

    <div id="${STATUS_INDICATOR_ID}" style="margin-top:10px; text-align:center; font-size:11px; font-weight:500; color:#fab1a0;">
      Flight info required
    </div>

    <div style="margin-top:6px; text-align:center; font-size:10px; color:#95a5a6;">
      Press 'W' to hide/show this panel
    </div>
  `;

  // helper to build input rows
  function buildInputRow(labelTxt, id, placeholder) {
    return `
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="width:70px; font-weight:500; color:#dfe6e9;">${labelTxt}:</label>
        <input id="${id}" placeholder="${placeholder}" style="
          flex:1;
          padding:6px 7px;
          border:none;
          border-radius:6px;
          background:rgba(255,255,255,0.15);
          color:#fff;
          font-size:11.5px;
          outline:none;
          transition:background 0.25s, box-shadow 0.25s;
          min-width:0;
        " maxlength="8">
      </div>`;
  }

  document.body.appendChild(flightUI);

  // field listeners
  [DEP_INPUT_ID, ARR_INPUT_ID, FLT_INPUT_ID, SQK_INPUT_ID].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      el.value = el.value.toUpperCase();
      updateStatus();
    });
    el.addEventListener("focus", () => {
      el.style.background = "rgba(255,255,255,0.25)";
      el.style.boxShadow = "0 0 6px rgba(116,185,255,0.6)";
    });
    el.addEventListener("blur", () => {
      el.style.background = "rgba(255,255,255,0.15)";
      el.style.boxShadow = "none";
    });
  });

  // button hovers
  const saveBtn = document.getElementById(SAVE_BTN_ID);
  const clearBtn = document.getElementById(CLEAR_BTN_ID);

  [saveBtn, clearBtn].forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "translateY(-2px)";
      btn.style.filter = "brightness(1.15)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "translateY(0)";
      btn.style.filter = "brightness(1)";
    });
  });

  // button actions
  saveBtn.onclick = () => {
    const dep = document.getElementById(DEP_INPUT_ID).value.trim();
    const arr = document.getElementById(ARR_INPUT_ID).value.trim();
    const flt = document.getElementById(FLT_INPUT_ID).value.trim();
    const sqk = document.getElementById(SQK_INPUT_ID).value.trim();

    if (!dep || !arr || !flt) {
      showToast("Please fill in Departure, Arrival, and Callsign", true);
      return;
    }
    if (sqk && !validateSquawk(sqk)) {
      showToast("Invalid squawk (digits 0–7 only)", true);
      return;
    }

    flightInfo = { departure: dep, arrival: arr, flightNo: flt, squawk: sqk };
    isFlightInfoSaved = true;
    updateStatus();
    showToast("Flight info saved. Data transmission started.");
  };

  clearBtn.onclick = () => {
    clearAllData();
    showToast("Flight info cleared. Data transmission stopped.");
  };

  updateStatus();
}

  function updateStatus() {
    const statusEl = document.getElementById(STATUS_INDICATOR_ID);
    if (!statusEl) return;

    if (isFlightInfoSaved && isFlightInfoComplete()) {
      statusEl.innerHTML = "Connected! Data transmission active";
      statusEl.style.color = "#27ae60";
    } else if (isFlightInfoComplete()) {
      statusEl.innerHTML = "Click Save to get connected";
      statusEl.style.color = "#f39c12";
    } else {
      statusEl.innerHTML = "Flight info required";
      statusEl.style.color = "#e74c3c";
    }
  }

  injectFlightUI();

  document.addEventListener("keydown", (e) => {
    if (
      e.key.toLowerCase() === "w" &&
      e.target.tagName !== "INPUT" &&
      e.target.tagName !== "TEXTAREA"
    ) {
      if (flightUI.style.display === "none") {
        flightUI.style.display = "block";
        showToast("Flight Info UI Shown");
      } else {
        flightUI.style.display = "none";
        showToast("Flight Info UI Hidden");
      }
    }
  });

  document.querySelectorAll(`#${UI_CONTAINER_ID} input`).forEach((el) => {
    el.setAttribute("autocomplete", "off");
  });

  document.addEventListener(
    "keydown",
    (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        e.stopPropagation();
      }
    },
    true,
  );
})();