(function () {
  "use strict";

  const API_URL = "https://radar-sse-production.up.railway.app/api/atc/position";
  const WS_URL = "wss://geofs-flightradar.duckdns.org/ws";
  const SEND_INTERVAL_MS = 5000;

  let info = { active: false, dep: "", arr: "", flt: "", sqk: "" };
  let wasOnGround = true;
  let takeoffTimeUTC = "";
  let socket = null;
  let wsReady = false;

  // function connectWS() {
  //   socket = new WebSocket(WS_URL);
  //   socket.onopen = () => {
  //     wsReady = true;
  //     socket.send(JSON.stringify({ type: "hello", role: "player" }));
  //     broadcastStatus();
  //   };
  //   socket.onclose = () => { wsReady = false; broadcastStatus(); setTimeout(connectWS, 5000); };
  // }

  function broadcastStatus() {
    let status = { text: "Flight info required", color: "#e74c3c" };
    if (info.active) {
      status = wsReady ? { text: "Connected & Transmitting", color: "#27ae60" } : { text: "WS Reconnecting...", color: "#f39c12" };
    }
    window.dispatchEvent(new CustomEvent("atc-status-update", { detail: status }));
  }

  window.addEventListener("atc-data-sync", (e) => { info = e.detail; broadcastStatus(); });

  // Simple in-page UI to set flight details and airline code
  function initOverlay() {
    const saved = JSON.parse(localStorage.getItem("geofsRadarInfo") || "{}");
    info = { ...info, ...saved };
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:999999;background:rgba(0,0,0,0.7);border:1px solid #0ff;padding:8px;border-radius:6px;color:#0ff;font:12px monospace";
    container.innerHTML = `
      <div style="margin-bottom:6px;font-weight:bold">GeoFS Radar Flight</div>
      <div style="display:grid;grid-template-columns:60px 140px;gap:6px;align-items:center">
        <label>Airline</label><input id="gr-airline" placeholder="AA" value="${saved.airline || ""}" />
        <label>Flight #</label><input id="gr-flight" placeholder="123" value="${saved.flightNum || ""}" />
        <label>DEP</label><input id="gr-dep" placeholder="KJFK" value="${saved.dep || ""}" />
        <label>ARR</label><input id="gr-arr" placeholder="KLAX" value="${saved.arr || ""}" />
        <label>Squawk</label><input id="gr-sqk" placeholder="7000" value="${saved.sqk || ""}" />
      </div>
      <div style="margin-top:8px;display:flex;gap:6px">
        <button id="gr-save" style="background:#0ff;color:#000;border:none;padding:4px 8px;border-radius:4px;cursor:pointer">Save</button>
        <button id="gr-toggle" style="background:#0ff;color:#000;border:none;padding:4px 8px;border-radius:4px;cursor:pointer">${saved.active ? "Disable" : "Enable"}</button>
      </div>
    `;
    document.body.appendChild(container);
    container.querySelector("#gr-save").addEventListener("click", () => {
      const airline = container.querySelector("#gr-airline").value.toUpperCase().trim();
      const flightNum = container.querySelector("#gr-flight").value.trim();
      const dep = container.querySelector("#gr-dep").value.toUpperCase().trim();
      const arr = container.querySelector("#gr-arr").value.toUpperCase().trim();
      const sqk = container.querySelector("#gr-sqk").value.trim();
      info.dep = dep; info.arr = arr; info.sqk = sqk;
      info.flt = airline && flightNum ? `${airline}${flightNum}` : (airline || flightNum || "");
      const saveObj = { airline, flightNum, dep, arr, sqk, active: info.active };
      localStorage.setItem("geofsRadarInfo", JSON.stringify(saveObj));
      window.dispatchEvent(new CustomEvent("atc-data-sync", { detail: info }));
    });
    container.querySelector("#gr-toggle").addEventListener("click", () => {
      info.active = !info.active;
      container.querySelector("#gr-toggle").textContent = info.active ? "Disable" : "Enable";
      const savedObj = JSON.parse(localStorage.getItem("geofsRadarInfo") || "{}");
      savedObj.active = info.active;
      localStorage.setItem("geofsRadarInfo", JSON.stringify(savedObj));
      broadcastStatus();
    });
  }

  function calculateAGL() {
    try {
      const altitudeMSL = geofs?.animation?.values?.altitude;
      const groundElevationFeet = geofs?.animation?.values?.groundElevationFeet;
      const aircraft = geofs?.aircraft?.instance;
      if (typeof altitudeMSL === "number" && typeof groundElevationFeet === "number" && aircraft?.collisionPoints?.length >= 2) {
        const collisionZFeet = aircraft.collisionPoints[aircraft.collisionPoints.length - 2].worldPosition[2] * 3.2808399;
        return Math.round(altitudeMSL - groundElevationFeet + collisionZFeet);
      }
    } catch (err) {}
    return null;
  }

  setInterval(async () => {
    if (!info.active || !geofs?.aircraft?.instance) return;

    const inst = geofs.aircraft.instance;
    const onGround = inst.groundContact ?? true;
    if (wasOnGround && !onGround) takeoffTimeUTC = new Date().toISOString();
    wasOnGround = onGround;

    const lla = inst.llaLocation || [];
    const altMSL = lla[2] ? lla[2] * 3.28084 : geofs.animation.values.altitude;
    const altAGL = calculateAGL();

    const payload = {
      id: geofs.userRecord.callsign,
      callsign: geofs.userRecord.callsign,
      type: inst.aircraftRecord.name || "Unknown",
      lat: lla[0],
      lon: lla[1],
      alt: typeof altAGL === "number" ? altAGL : Math.round(altMSL),
      altMSL: Math.round(altMSL),
      heading: Math.round(geofs.animation.values.heading360 || 0),
      speed: Math.round(geofs.animation.values.kias || 0),
      flightNo: info.flt,
      departure: info.dep,
      arrival: info.arr,
      takeoffTime: takeoffTimeUTC,
      squawk: info.sqk,
      flightPlan: geofs.flightPlan?.export ? geofs.flightPlan.export() : [],
      nextWaypoint: geofs.flightPlan?.trackedWaypoint?.ident || null,
      vspeed: Math.floor(geofs.animation?.values?.verticalSpeed || 0),
      userId: geofs.userRecord.userId || null
    };

    fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => {});
    // if (wsReady) socket.send(JSON.stringify({ type: "position_update", payload: payload }));
  }, SEND_INTERVAL_MS);

  connectWS();
  try { initOverlay(); } catch (e) {}
})();