// Seyahat formu hesaplamaları ve geriye uyumlu analitik exportları.
import { getCityCoords, getStopCoords } from './cityCoordinates';
import { locationCity } from './location';
export { createChartData, createStats, toNumber } from './analytics';

const toNumeric = (value) => Number.parseFloat(value) || 0;

export const calculateVehicleCost = (trip) =>
  ['fuelCost', 'roadCost', 'bridgeCost', 'parkingCost', 'otherCost'].reduce((sum, key) => sum + toNumeric(trip[key]), 0);

export const calculateTotalCost = (trip) => {
  if (trip.transportType === 'Araç') return calculateVehicleCost(trip);
  return toNumeric(trip.ticketPrice);
};

export const calculateDurationMinutes = (departureTime, arrivalTime) => {
  if (!departureTime || !arrivalTime) return '';
  const [dh, dm] = departureTime.split(':').map(Number);
  const [ah, am] = arrivalTime.split(':').map(Number);
  let start = dh * 60 + dm;
  let end = ah * 60 + am;
  if (end < start) end += 24 * 60;
  return end - start;
};

export const normalizeTripPayload = (trip, userId) => {
  const durationMinutes = trip.durationMinutes || calculateDurationMinutes(trip.departureTime, trip.arrivalTime);
  const totalCost = calculateTotalCost(trip);
  const distanceKm = toNumeric(trip.distanceKm);
  const stops = typeof trip.stops === 'string' ? trip.stops.split(',').map((stop) => stop.trim()).filter(Boolean) : trip.stops || [];
  const fromCoords = trip.fromCoords || getCityCoords(locationCity(trip.from) || trip.from);
  const toCoords = trip.toCoords || getCityCoords(locationCity(trip.to) || trip.to);

  return {
    ...trip,
    userId,
    title: trip.title || `${trip.from || ''} → ${trip.to || ''}`.trim(),
    from: trip.from || '',
    to: trip.to || '',
    transportType: trip.transportType || 'Diğer',
    company: trip.company || '',
    vehicleId: trip.vehicleId || '',
    vehicleName: trip.vehicleName || trip.plate || '',
    plate: trip.plate || '',
    fuelType: trip.fuelType || '',
    seatNo: trip.seatNo || '',
    ticketNo: trip.ticketNo || '',
    platformNo: trip.platformNo || '',
    gateNo: trip.gateNo || '',
    flightNo: trip.flightNo || '',
    airlineCode: trip.airlineCode || '',
    baggageInfo: trip.baggageInfo || '',
    terminal: trip.terminal || '',
    wagonNo: trip.wagonNo || '',
    trainNo: trip.trainNo || '',
    cabinNo: trip.cabinNo || '',
    ferryLine: trip.ferryLine || '',
    driverName: trip.driverName || '',
    date: trip.date || new Date().toISOString().slice(0, 10),
    departureTime: trip.departureTime || '',
    arrivalTime: trip.arrivalTime || '',
    stops,
    durationMinutes: toNumeric(durationMinutes),
    distanceKm,
    ticketPrice: toNumeric(trip.ticketPrice),
    fuelCost: toNumeric(trip.fuelCost),
    roadCost: toNumeric(trip.roadCost),
    bridgeCost: toNumeric(trip.bridgeCost),
    parkingCost: toNumeric(trip.parkingCost),
    otherCost: toNumeric(trip.otherCost),
    totalCost,
    costPerKm: distanceKm ? totalCost / distanceKm : 0,
    pnr: trip.pnr || '',
    ticketUrl: trip.ticketUrl || trip.fileUrl || '',
    routeNote: trip.routeNote || '',
    notes: trip.notes || '',
    fromCoords,
    toCoords,
    stopCoords:
      trip.stopCoords ||
      getStopCoords(stops).map((stop) => ({
        name: stop.name,
        lat: stop.coords[0],
        lng: stop.coords[1],
      })),
  };
};
