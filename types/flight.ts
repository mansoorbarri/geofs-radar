export type FlightSizeCategory =
  | "ga"
  | "helicopter"
  | "light"
  | "regional"
  | "narrow"
  | "wide";

export interface AirlineInfo {
  code: string; // IATA/ICAO code
  name: string;
  logoUrl?: string; // public/logos/<code>.png preferred
}

export interface FlightIdentity {
  callsign?: string;
  flightNo?: string; // e.g. AA123
  airlineCode?: string; // derived from flightNo prefix
}

export interface FlightRoute {
  departure?: string; // ICAO/IATA
  arrival?: string; // ICAO/IATA
}

export interface Incident {
  id: string; // aircraft id at time of incident
  callsign?: string;
  flightNo?: string;
  squawk: string; // 7700, 7600, 7500 or other
  ts: number; // epoch ms
}

export interface FlightSummary {
  id: string;
  type: string;
  size: FlightSizeCategory;
  identity: FlightIdentity;
  route: FlightRoute;
  lastSeen: number;
  firstSeen: number;
}

const narrowBodyPatterns = [
  /A(19|20|21)\d/i, // A319/A320/A321
  /B(73[0-9]|MAX)/i,
  /(E17|E19)\d/i, // E170/E190 series
  /CRJ/i,
  /CSeries|A220/i,
];

const wideBodyPatterns = [
  /A(33|34|35|38)\d/i, // A330/A340/A350/A380
  /B(76|77|78|74)\d/i, // B767/B777/B787/B747
];

const regionalPatterns = [
  /Dash|Q400|ATR/i,
  /RJ\d/i,
];

const helicopterPatterns = [
  /H\d{3}/i,
  /Bell|EC\d|AS\d/i,
  /UH-\d|AH-\d|CH-\d/i,
];

const gaPatterns = [
  /Cessna|C1(5|7)2|C2(0|1)0|SR22|Bonanza|Baron|PA-\d/i,
  /Piper|Mooney|Diamond|Cirrus/i,
];

export function getSizeCategoryFor(type: string): FlightSizeCategory {
  if (!type) return "ga";
  if (wideBodyPatterns.some((p) => p.test(type))) return "wide";
  if (narrowBodyPatterns.some((p) => p.test(type))) return "narrow";
  if (regionalPatterns.some((p) => p.test(type))) return "regional";
  if (helicopterPatterns.some((p) => p.test(type))) return "helicopter";
  if (gaPatterns.some((p) => p.test(type))) return "ga";
  // Fallback heuristic: treat jets with 2-3 digits as narrow, big as wide
  if (/\b(7[0-9]{2}|3[0-9]{2})\b/.test(type)) return "narrow";
  return "light";
}

export function airlineCodeFromFlightNo(flightNo?: string): string | undefined {
  if (!flightNo) return undefined;
  const m = flightNo.match(/^([A-Z]{2,3})\d+/i);
  return m ? m[1].toUpperCase() : undefined;
}
