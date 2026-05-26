// Yeni seyahat formunda tek kutudan seçilebilen temel Türkiye lokasyonları.
import { cityCoordinates } from './cityCoordinates';

export const travelLocations = [
  { name: 'İstanbul Ümraniye Dudullu Otogarı', city: 'İstanbul', district: 'Ümraniye', type: 'Otogar', lat: 41.0169, lng: 29.1616, aliases: ['Dudullu', 'Ümraniye Otogar'] },
  { name: 'İstanbul Esenler Otogarı', city: 'İstanbul', district: 'Esenler', type: 'Otogar', lat: 41.0407, lng: 28.8948, aliases: ['Esenler', 'Büyük İstanbul Otogarı'] },
  { name: 'İstanbul Havalimanı', city: 'İstanbul', district: 'Arnavutköy', type: 'Havalimanı', lat: 41.2619, lng: 28.7419, aliases: ['IST', 'İstanbul Airport'] },
  { name: 'İstanbul Sabiha Gökçen Havalimanı', city: 'İstanbul', district: 'Pendik', type: 'Havalimanı', lat: 40.8986, lng: 29.3092, aliases: ['SAW', 'Sabiha Gökçen'] },
  { name: 'Tokat Merkez Tokat Otogarı', city: 'Tokat', district: 'Merkez', type: 'Otogar', lat: 40.3263, lng: 36.5522, aliases: ['Tokat Otogarı'] },
  { name: 'Şanlıurfa GAP Havalimanı', city: 'Şanlıurfa', district: 'Merkez', type: 'Havalimanı', lat: 37.0943, lng: 38.8471, aliases: ['GAP', 'Urfa Havalimanı'] },
  { name: 'Şanlıurfa Merkez Otogarı', city: 'Şanlıurfa', district: 'Merkez', type: 'Otogar', lat: 37.1674, lng: 38.7955, aliases: ['Urfa Otogarı'] },
  { name: 'Ankara AŞTİ', city: 'Ankara', district: 'Çankaya', type: 'Otogar', lat: 39.9182, lng: 32.8136, aliases: ['AŞTİ', 'Ankara Otogarı'] },
  { name: 'Ankara Esenboğa Havalimanı', city: 'Ankara', district: 'Akyurt', type: 'Havalimanı', lat: 40.1281, lng: 32.9951, aliases: ['ESB', 'Esenboğa'] },
  { name: 'İzmir Otogarı', city: 'İzmir', district: 'Bornova', type: 'Otogar', lat: 38.4494, lng: 27.2181, aliases: ['Bornova Otogar'] },
  { name: 'İzmir Adnan Menderes Havalimanı', city: 'İzmir', district: 'Gaziemir', type: 'Havalimanı', lat: 38.2924, lng: 27.1569, aliases: ['ADB', 'Adnan Menderes'] },
  { name: 'Bursa Otogarı', city: 'Bursa', district: 'Osmangazi', type: 'Otogar', lat: 40.2669, lng: 29.0611, aliases: ['Bursa Terminal'] },
  { name: 'Balıkesir Otogarı', city: 'Balıkesir', district: 'Karesi', type: 'Otogar', lat: 39.6533, lng: 27.8828, aliases: ['Balıkesir Terminal'] },
  { name: 'Adana Otogarı', city: 'Adana', district: 'Seyhan', type: 'Otogar', lat: 36.9994, lng: 35.2806, aliases: ['Adana Terminal', 'Adana Merkez Otogar'] },
  { name: 'Adana Şakirpaşa Havalimanı', city: 'Adana', district: 'Seyhan', type: 'Havalimanı', lat: 36.9822, lng: 35.2804, aliases: ['ADA', 'Şakirpaşa'] },
  { name: 'Silifke Otogarı', city: 'Mersin', district: 'Silifke', type: 'Otogar', lat: 36.3778, lng: 33.9344, aliases: ['Silifke Terminal'] },
];

export const locationOptions = travelLocations.map((location) => ({ value: location.name, label: location.name }));

export const cityLocationFromText = (value = '') => {
  const query = normalizeLocationText(value);
  const cityName = Object.keys(cityCoordinates).find((city) => normalizeLocationText(city) === query);
  if (!cityName) return null;
  const [lat, lng] = cityCoordinates[cityName];
  return {
    name: cityName,
    city: cityName,
    district: '',
    type: 'Şehir',
    lat,
    lng,
    provider: 'local-city',
  };
};

export const findTravelLocation = (value = '') => {
  const query = normalizeLocationText(value);
  if (!query) return null;
  const cityLocation = cityLocationFromText(value);
  if (cityLocation) return cityLocation;
  return (
    travelLocations.find((location) => normalizeLocationText(location.name) === query) ||
    travelLocations.find((location) =>
      [location.name, location.city, location.district, location.type, ...(location.aliases || [])]
        .filter(Boolean)
        .some((part) => normalizeLocationText(part).includes(query)),
    ) ||
    null
  );
};

export const locationToText = (location) => {
  if (!location) return '';
  if (typeof location === 'string') return location;
  return location.name || [location.city, location.district, location.pointName].filter(Boolean).join(' ');
};

export const normalizeLocationText = (value = '') =>
  String(value)
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
