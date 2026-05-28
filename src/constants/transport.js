import { Bus, Car, CircleHelp, Plane, Ship, Train } from 'lucide-react';

export const transportTypes = ['Uçak', 'Otobüs', 'Araç', 'Tren', 'Feribot', 'Diğer'];

export const transportColors = {
  Araç: '#f59e0b',
  Otobüs: '#8b5cf6',
  Uçak: '#38bdf8',
  Tren: '#22c55e',
  Feribot: '#14b8a6',
  Diğer: '#ef4444',
};

export const transportLabels = {
  Araç: 'Araç',
  Otobüs: 'Otobüs',
  Uçak: 'Uçak',
  Tren: 'Tren',
  Feribot: 'Feribot',
  Diğer: 'Diğer',
};

export const transportIcons = {
  Araç: Car,
  Otobüs: Bus,
  Uçak: Plane,
  Tren: Train,
  Feribot: Ship,
  Diğer: CircleHelp,
};

const aliases = {
  araba: 'Araç',
  arac: 'Araç',
  araç: 'Araç',
  car: 'Araç',
  auto: 'Araç',
  vehicle: 'Araç',
  bus: 'Otobüs',
  otobus: 'Otobüs',
  otobüs: 'Otobüs',
  plane: 'Uçak',
  airplane: 'Uçak',
  flight: 'Uçak',
  ucak: 'Uçak',
  uçak: 'Uçak',
  train: 'Tren',
  tren: 'Tren',
  ferry: 'Feribot',
  feribot: 'Feribot',
};

export function normalizeTransportType(value) {
  const text = String(value || '').trim();
  if (!text) return 'Diğer';
  const normalized = text.toLocaleLowerCase('tr-TR');
  return aliases[normalized] || transportTypes.find((type) => type.toLocaleLowerCase('tr-TR') === normalized) || 'Diğer';
}

export function getTransportColor(value) {
  return transportColors[normalizeTransportType(value)] || transportColors.Diğer;
}

export function getTransportLabel(value) {
  const type = normalizeTransportType(value);
  return transportLabels[type] || transportLabels.Diğer;
}
