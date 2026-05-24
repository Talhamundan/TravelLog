// Excel import/export akışı: şablon üretir, xlsx dışa aktarır ve toplu seyahatleri okur.
import * as XLSX from 'xlsx';
import { locationCity, locationLabel } from './location';

const headers = [
  'Başlık',
  'Başlangıç İl',
  'Başlangıç İlçe',
  'Başlangıç Nokta',
  'Başlangıç Tip',
  'Varış İl',
  'Varış İlçe',
  'Varış Nokta',
  'Varış Tip',
  'Ara Duraklar',
  'Ulaşım Türü',
  'Firma',
  'Tarih',
  'Başlangıç Saati',
  'Varış Saati',
  'Süre Dk',
  'Km',
  'Bilet Fiyatı',
  'Para Birimi',
  'Plaka',
  'Araç Adı',
  'Yakıt',
  'Yol',
  'Köprü',
  'Otopark',
  'Diğer',
  'PNR',
  'Bilet No',
  'Notlar',
];

const sampleRows = [
  {
    'Başlık': 'İstanbul Tokat araç yolculuğu',
    'Başlangıç İl': 'İstanbul',
    'Başlangıç İlçe': 'Ümraniye',
    'Başlangıç Nokta': 'Dudullu Otogarı',
    'Başlangıç Tip': 'Otogar',
    'Varış İl': 'Tokat',
    'Varış İlçe': 'Merkez',
    'Varış Nokta': 'Tokat Otogarı',
    'Varış Tip': 'Otogar',
    'Ara Duraklar': 'Bolu, Amasya',
    'Ulaşım Türü': 'Araç',
    Firma: 'Kişisel Araç',
    Tarih: '2026-05-23',
    'Başlangıç Saati': '08:00',
    'Varış Saati': '17:20',
    'Süre Dk': 560,
    Km: 780,
    'Bilet Fiyatı': 0,
    'Para Birimi': 'TRY',
    Plaka: '34 EJC 537',
    'Araç Adı': 'Skoda Scala',
    Yakıt: 2100,
    Yol: 320,
    Köprü: 120,
    Otopark: 0,
    Diğer: 210,
    PNR: '',
    'Bilet No': '',
    Notlar: 'Örnek import satırı',
  },
];

const toNumber = (value) => Number.parseFloat(String(value ?? '').replace(',', '.')) || 0;

const normalizeDate = (value) => {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  return String(value).slice(0, 10);
};

const makeLocation = (city, district, pointName, type) => ({
  city: String(city || '').trim(),
  district: String(district || '').trim(),
  pointName: String(pointName || '').trim(),
  type: String(type || '').trim() || 'Diğer',
});

export const exportTripsToXlsx = (trips, filename = 'travellog-seyahatler.xlsx') => {
  const rows = trips.map((trip) => ({
    'Başlık': trip.title || '',
    'Başlangıç İl': locationCity(trip.from),
    'Başlangıç İlçe': typeof trip.from === 'object' ? trip.from.district || '' : '',
    'Başlangıç Nokta': typeof trip.from === 'object' ? trip.from.pointName || '' : locationLabel(trip.from),
    'Başlangıç Tip': typeof trip.from === 'object' ? trip.from.type || '' : '',
    'Varış İl': locationCity(trip.to),
    'Varış İlçe': typeof trip.to === 'object' ? trip.to.district || '' : '',
    'Varış Nokta': typeof trip.to === 'object' ? trip.to.pointName || '' : locationLabel(trip.to),
    'Varış Tip': typeof trip.to === 'object' ? trip.to.type || '' : '',
    'Ara Duraklar': Array.isArray(trip.stops) ? trip.stops.map((stop) => (typeof stop === 'object' ? stop.city || stop.pointName : stop)).join(', ') : trip.stops || '',
    'Ulaşım Türü': trip.transportType || '',
    Firma: trip.company || '',
    Tarih: trip.date || '',
    'Başlangıç Saati': trip.departureTime || '',
    'Varış Saati': trip.arrivalTime || '',
    'Süre Dk': trip.durationMinutes || 0,
    Km: trip.distanceKm || 0,
    'Bilet Fiyatı': trip.ticketPrice || 0,
    'Para Birimi': trip.currency || 'TRY',
    Plaka: trip.plate || '',
    'Araç Adı': trip.vehicleName || '',
    Yakıt: trip.fuelCost || 0,
    Yol: trip.roadCost || 0,
    Köprü: trip.bridgeCost || 0,
    Otopark: trip.parkingCost || 0,
    Diğer: trip.otherCost || 0,
    PNR: trip.pnr || '',
    'Bilet No': trip.ticketNo || '',
    Notlar: trip.notes || '',
  }));
  writeWorkbook(rows, filename);
};

export const downloadTripImportTemplate = () => writeWorkbook(sampleRows, 'travellog-import-sablonu.xlsx');

export const parseTripWorkbook = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows
    .map((row) => ({
      title: row['Başlık'],
      from: makeLocation(row['Başlangıç İl'], row['Başlangıç İlçe'], row['Başlangıç Nokta'], row['Başlangıç Tip']),
      to: makeLocation(row['Varış İl'], row['Varış İlçe'], row['Varış Nokta'], row['Varış Tip']),
      stops: String(row['Ara Duraklar'] || '').split(',').map((stop) => stop.trim()).filter(Boolean),
      transportType: row['Ulaşım Türü'] || 'Diğer',
      company: row.Firma || '',
      date: normalizeDate(row.Tarih),
      departureTime: row['Başlangıç Saati'] || '',
      arrivalTime: row['Varış Saati'] || '',
      durationMinutes: toNumber(row['Süre Dk']),
      distanceKm: toNumber(row.Km),
      ticketPrice: toNumber(row['Bilet Fiyatı']),
      currency: row['Para Birimi'] || 'TRY',
      plate: row.Plaka || '',
      vehicleName: row['Araç Adı'] || row.Plaka || '',
      fuelCost: toNumber(row.Yakıt),
      roadCost: toNumber(row.Yol),
      bridgeCost: toNumber(row.Köprü),
      parkingCost: toNumber(row.Otopark),
      otherCost: toNumber(row.Diğer),
      pnr: row.PNR || '',
      ticketNo: row['Bilet No'] || '',
      notes: row.Notlar || '',
    }))
    .filter((trip) => trip.title || trip.from.city || trip.to.city);
};

const writeWorkbook = (rows, filename) => {
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(headers.map((header) => [header, '']))], {
    header: headers,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seyahatler');
  XLSX.writeFile(workbook, filename);
};
