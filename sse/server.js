const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

let aircraftMap = new Map();
let subscribers = [];
let flightSessions = new Map();

function broadcast() {
  const message = JSON.stringify({
    count: aircraftMap.size,
    aircraft: Array.from(aircraftMap.values()),
    timestamp: new Date().toISOString(),
  });
  subscribers.forEach((s) => s.res.write(`data: ${message}\n\n`));
}

async function finalizeFlight(id) {
  const session = flightSessions.get(id);
  if (!session) return;

  try {
    if (session.coords.length > 2) {
      await prisma.flight.create({
        data: {
          userId: session.userId,
          callsign: session.callsign,
          aircraftType: session.aircraftType,
          depICAO: session.departure,
          arrICAO: session.arrival,
          routeData: session.coords,
          startTime: session.startTime,
          endTime: new Date(),
        },
      });
    }
  } catch (e) {
    console.error(e);
  } finally {
    flightSessions.delete(id);
  }
}

app.post("/api/atc/position", async (req, res) => {
  const data = req.body;
  if (data.id) {
    let role = "FREE"; // Default to FREE
    let airlineLogo = null;
    let userId = null;

    if (data.googleId) {
      try {
        const searchId = String(data.googleId);
        const user = await prisma.user.findUnique({
          where: { googleId: searchId },
        });

        if (user) {
          role = user.role;
          userId = user.id;
          console.log(
            `[AUTH] Found ${user.clerkId} | Role: ${role} | ID: ${userId}`
          );
        } else {
          // Explicitly default to FREE when user not found
          role = "FREE";
          console.log(
            `[AUTH] No user found for ID: ${searchId} - defaulting to FREE`
          );
        }
      } catch (e) {
        // On DB error, also default to FREE
        role = "FREE";
        console.error("[DB ERROR] Defaulting to FREE role:", e);
      }
    }

    if (role === "PRO" && userId) {
      if (!flightSessions.has(data.id)) {
        flightSessions.set(data.id, {
          userId: userId,
          callsign: data.callsign || "Unknown",
          aircraftType: data.type || "Unknown",
          departure: data.departure || "???",
          arrival: data.arrival || "???",
          coords: [[data.lat, data.lon]],
          startTime: new Date(),
        });
      } else {
        let session = flightSessions.get(data.id);
        const last = session.coords[session.coords.length - 1];
        if (
          Math.abs(last[0] - data.lat) > 0.0002 ||
          Math.abs(last[1] - data.lon) > 0.0002
        ) {
          session.coords.push([data.lat, data.lon]);
        }
      }
    }

    aircraftMap.set(data.id, {
      ...data,
      role,
      airlineLogo,
      ts: Date.now(),
    });
    broadcast();
  }
  res.sendStatus(200);
});

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const initial = JSON.stringify({
    count: aircraftMap.size,
    aircraft: Array.from(aircraftMap.values()),
  });
  res.write(`data: ${initial}\n\n`);

  const id = Date.now();
  subscribers.push({ id, res });

  req.on("close", () => {
    subscribers = subscribers.filter((s) => s.id !== id);
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [id, aircraft] of aircraftMap.entries()) {
    if (now - (aircraft.ts || 0) > 12000) {
      console.log(`[TIMEOUT] ${id} timed out. Active sessions: ${flightSessions.has(id)}`);
      if (flightSessions.has(id)) {
        finalizeFlight(id);
      }
      aircraftMap.delete(id);
    }
  }
}, 5000);

app.listen(process.env.PORT || 3001, "0.0.0.0");