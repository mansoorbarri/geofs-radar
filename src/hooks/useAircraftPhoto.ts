import { useEffect, useState } from "react";
import { getAircraftImage, type AircraftImage } from "~/app/actions/aircraft-images";

// Extract airline code from flight number/callsign
// Supports both IATA (2-letter, e.g., "EK90" -> "EK") and ICAO (3-letter, e.g., "UAE90" -> "UAE")
function extractAirlineCode(flightNo: string | undefined): string | null {
  if (!flightNo) return null;
  const regex = /^([A-Z]{2,3})/;
  const match = regex.exec(flightNo.trim().toUpperCase());
  return match?.[1] ?? null;
}

// Normalize aircraft type (e.g., "Airbus A350-900" -> "A350", "Boeing 777-300ER" -> "B777")
function normalizeAircraftType(type: string | undefined): string | null {
  if (!type) return null;
  const cleaned = type.trim().toUpperCase();

  // Common patterns to extract
  // A350, A320, A380, etc.
  const airbusRegex = /A\d{3}/;
  const airbusMatch = airbusRegex.exec(cleaned);
  if (airbusMatch) return airbusMatch[0];

  // B737, B777, B787, etc.
  const boeingRegex = /B\d{3}/;
  const boeingMatch = boeingRegex.exec(cleaned);
  if (boeingMatch) return boeingMatch[0];

  // "Boeing 777", "Boeing 737-800", "777", "787-9" -> B777, B737, B787
  // Matches 7x7 pattern (Boeing commercial jets) anywhere in string
  const boeingNameRegex = /\b(7[0-9]7)\b/;
  const boeingNameMatch = boeingNameRegex.exec(cleaned);
  if (boeingNameMatch) return `B${boeingNameMatch[1]}`;

  // CRJ, ERJ, E175, E190, etc.
  const embraerRegex = /E\d{3}|ERJ\d{3}|CRJ\d{3}/;
  const embraerMatch = embraerRegex.exec(cleaned);
  if (embraerMatch) return embraerMatch[0];

  // Return first word/code if nothing else matches
  const firstWord = cleaned.split(/[\s-]/)[0];
  return firstWord || null;
}

export interface AircraftPhotoData {
  imageUrl: string;
  photographer: string | null;
}

export const useAircraftPhoto = (
  callsign: string | undefined,
  aircraftType: string | undefined
) => {
  const [photo, setPhoto] = useState<AircraftPhotoData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const airlineCode = extractAirlineCode(callsign);
    const normalizedType = normalizeAircraftType(aircraftType);

    if (!airlineCode || !normalizedType) {
      setPhoto(null);
      return;
    }

    const fetchPhoto = async () => {
      setLoading(true);
      try {
        const image = await getAircraftImage(airlineCode, normalizedType);
        if (image) {
          setPhoto({
            imageUrl: image.imageUrl,
            photographer: image.photographer,
          });
        } else {
          setPhoto(null);
        }
      } catch (err) {
        console.error("Aircraft photo fetch error:", err);
        setPhoto(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPhoto();
  }, [callsign, aircraftType]);

  return { photo, loading };
};
