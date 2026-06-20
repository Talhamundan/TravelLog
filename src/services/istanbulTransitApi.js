import { decodeOverviewPolyline, geocodeOsmPlace } from './osmRouteService';

const OTP_API_URL = import.meta.env.VITE_OTP_BASE_URL || '';
const ISTANBUL_VIEWPORT = {
  low: { latitude: 40.78, longitude: 28.0 },
  high: { latitude: 41.33, longitude: 29.95 },
};

export const transportPreferences = [
  { value: 'fastest', label: 'En hızlı' },
  { value: 'least-transfer', label: 'En az aktarma' },
  { value: 'lowest-cost', label: 'En düşük ücret' },
  { value: 'least-walk', label: 'En az yürüme' },
];

export function hasTransitApiConfig() {
  return Boolean(OTP_API_URL && OTP_API_URL !== 'BURAYA_OTP_ENDPOINT_GELECEK');
}

export async function searchPlaces(query) {
  const input = query.trim();
  if (!input) return [];
  const results = await geocodeOsmPlace(`${input}, İstanbul`);
  return results
    .filter((place) => isInIstanbulBounds(place))
    .map((place) => ({
      ...place,
      label: place.name,
      secondaryText: place.formattedAddress,
      provider: place.provider || 'osm',
    }))
    .slice(0, 8);
}

export async function getTransitRoutes(origin, destination, departureTime, preference = 'fastest') {
  if (!hasTransitApiConfig()) throw new Error('OTP_API_URL_MISSING');
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    throw new Error('VALID_PLACE_REQUIRED');
  }

  const response = await fetch(OTP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: OTP_PLAN_QUERY,
      variables: buildOtpVariables(origin, destination, departureTime, preference),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors?.length) {
    const error = new Error(data.errors?.[0]?.message || 'OpenTripPlanner rota isteği başarısız.');
    error.details = data;
    throw error;
  }

  const itineraries = data.data?.plan?.itineraries || [];
  return sortRoutesByPreference(
    itineraries.map((itinerary, index) => normalizeOtpItinerary(itinerary, index, origin, destination)),
    preference,
  );
}

const OTP_PLAN_QUERY = `
  query IstanbulTransitPlan($from: InputCoordinates!, $to: InputCoordinates!, $date: String!, $time: String!, $numItineraries: Int!, $walkReluctance: Float) {
    plan(
      from: $from,
      to: $to,
      date: $date,
      time: $time,
      numItineraries: $numItineraries,
      walkReluctance: $walkReluctance,
      transportModes: [
        { mode: WALK },
        { mode: BUS },
        { mode: RAIL },
        { mode: TRAM },
        { mode: SUBWAY },
        { mode: FERRY },
        { mode: FUNICULAR },
        { mode: CABLE_CAR }
      ]
    ) {
      itineraries {
        duration
        walkTime
        waitingTime
        transfers
        fares {
          type
          currency
          cents
        }
        legs {
          mode
          duration
          distance
          from { name lat lon }
          to { name lat lon }
          route {
            shortName
            longName
            mode
          }
          agency {
            name
          }
          legGeometry {
            points
          }
        }
      }
    }
  }
`;

function buildOtpVariables(origin, destination, departureTime, preference) {
  const date = toOtpDateTime(departureTime);
  return {
    from: { lat: Number(origin.lat), lon: Number(origin.lng) },
    to: { lat: Number(destination.lat), lon: Number(destination.lng) },
    date: date.day,
    time: date.time,
    numItineraries: 5,
    walkReluctance: preference === 'least-walk' ? 6 : 2,
  };
}

function normalizeOtpItinerary(itinerary, index, origin, destination) {
  const legs = itinerary.legs || [];
  const routeSteps = legs.map(normalizeOtpLeg);
  const transitSteps = routeSteps.filter((step) => step.vehicle !== 'Yürüyüş');
  const vehicles = unique(transitSteps.map((step) => step.vehicle).filter(Boolean));
  const lines = unique(transitSteps.map((step) => step.line).filter(Boolean));
  const fare = extractOtpFare(itinerary);
  const polyline = buildItineraryPolyline(legs);

  return {
    id: `otp-transit-${index + 1}`,
    title: buildRouteTitle(vehicles, lines, index),
    name: buildRouteTitle(vehicles, lines, index),
    from: origin.formattedAddress || origin.label,
    to: destination.formattedAddress || destination.label,
    durationMinutes: secondsToMinutes(itinerary.duration),
    estimatedCost: fare.value,
    estimatedCostText: fare.text,
    transferCount: Number.isFinite(Number(itinerary.transfers)) ? Number(itinerary.transfers) : Math.max(transitSteps.length - 1, 0),
    walkingMinutes: secondsToMinutes(itinerary.walkTime),
    vehicles,
    lines,
    routeSteps,
    polyline,
    source: 'opentripplanner',
    badges: buildRouteBadges(index, itinerary.transfers),
    accent: ['#38bdf8', '#22c55e', '#f59e0b', '#a855f7'][index % 4],
  };
}

function normalizeOtpLeg(leg) {
  const line = leg.route?.shortName || leg.route?.longName || normalizeVehicle(leg.mode);
  const vehicle = normalizeVehicle(leg.route?.mode || leg.mode, line);
  const from = leg.from?.name;
  const to = leg.to?.name;
  return {
    title: vehicle === 'Yürüyüş' ? `${from || 'Başlangıç'} → ${to || 'Aktarma'} yürü` : `${line} ${from || ''} → ${to || ''}`.trim(),
    durationMinutes: secondsToMinutes(leg.duration),
    distanceMeters: Math.round(Number(leg.distance || 0)),
    line,
    vehicle,
    departureStop: from || '',
    arrivalStop: to || '',
    polyline: leg.legGeometry?.points || '',
    startLocation: normalizeOtpPoint(leg.from),
    endLocation: normalizeOtpPoint(leg.to),
  };
}

function extractOtpFare(itinerary) {
  const fares = itinerary.fares || [];
  const fare = fares.find((item) => Number.isFinite(Number(item.cents)));
  if (!fare) return { value: null, text: 'Tahmini ücret yok' };
  const value = Number(fare.cents) / 100;
  return {
    value,
    text: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: fare.currency || 'TRY' }).format(value),
  };
}

function buildItineraryPolyline(legs) {
  const points = legs.flatMap((leg) => decodeOverviewPolyline(leg.legGeometry?.points || ''));
  return encodePolyline(points);
}

function sortRoutesByPreference(routes, preference) {
  const sorted = [...routes];
  if (preference === 'lowest-cost') {
    return sorted.sort((a, b) => {
      if (a.estimatedCost == null && b.estimatedCost == null) return a.durationMinutes - b.durationMinutes;
      if (a.estimatedCost == null) return 1;
      if (b.estimatedCost == null) return -1;
      return a.estimatedCost - b.estimatedCost;
    });
  }
  if (preference === 'least-transfer') return sorted.sort((a, b) => a.transferCount - b.transferCount);
  if (preference === 'least-walk') return sorted.sort((a, b) => a.walkingMinutes - b.walkingMinutes);
  return sorted.sort((a, b) => a.durationMinutes - b.durationMinutes);
}

function buildRouteTitle(vehicles, lines, index) {
  if (lines.length) return lines.slice(0, 3).join(' + ');
  if (vehicles.length) return vehicles.slice(0, 3).join(' + ');
  return `Toplu taşıma rotası ${index + 1}`;
}

function buildRouteBadges(index, transfers) {
  return [index === 0 ? 'Önerilen' : 'Alternatif', Number(transfers || 0) <= 1 ? 'Az aktarma' : `${Number(transfers || 0)} aktarma`];
}

function normalizeVehicle(value, lineName = '') {
  const lineText = String(lineName || '').toLocaleLowerCase('tr-TR');
  if (lineText.includes('metrobüs') || /^34[a-z]?$/i.test(String(lineName || '').trim())) return 'Metrobüs';
  if (lineText.includes('marmaray')) return 'Marmaray';
  const normalized = String(value || '').toUpperCase();
  const map = {
    BUS: 'Otobüs',
    RAIL: 'Raylı sistem',
    TRAM: 'Tramvay',
    SUBWAY: 'Metro',
    FERRY: 'Vapur',
    FUNICULAR: 'Füniküler',
    CABLE_CAR: 'Teleferik',
    GONDOLA: 'Teleferik',
    WALK: 'Yürüyüş',
  };
  return map[normalized] || value || 'Toplu taşıma';
}

function toOtpDateTime(value) {
  const date = value ? new Date(value) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return {
    day: validDate.toISOString().slice(0, 10),
    time: validDate.toTimeString().slice(0, 8),
  };
}

function secondsToMinutes(seconds) {
  return Math.max(Math.round(Number(seconds || 0) / 60), 0);
}

function normalizeOtpPoint(point) {
  if (!point?.lat || !point?.lon) return null;
  return {
    lat: Number(point.lat),
    lng: Number(point.lon),
  };
}

function isInIstanbulBounds(place) {
  const lat = Number(place.lat);
  const lng = Number(place.lng);
  return lat >= ISTANBUL_VIEWPORT.low.latitude
    && lat <= ISTANBUL_VIEWPORT.high.latitude
    && lng >= ISTANBUL_VIEWPORT.low.longitude
    && lng <= ISTANBUL_VIEWPORT.high.longitude;
}

function unique(values) {
  return [...new Set(values)];
}

function encodePolyline(points) {
  if (!points.length) return '';
  let lastLat = 0;
  let lastLng = 0;
  return points.map((point) => {
    const lat = Math.round(Number(point.lat) * 1e5);
    const lng = Math.round(Number(point.lng) * 1e5);
    const encoded = encodePolylineValue(lat - lastLat) + encodePolylineValue(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
    return encoded;
  }).join('');
}

function encodePolylineValue(value) {
  let coordinate = value < 0 ? ~(value << 1) : value << 1;
  let output = '';
  while (coordinate >= 0x20) {
    output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
    coordinate >>= 5;
  }
  return output + String.fromCharCode(coordinate + 63);
}
