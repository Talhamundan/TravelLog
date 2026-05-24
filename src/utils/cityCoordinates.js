// Harita için Türkiye şehirlerinin temel koordinat eşleştirmeleri.
export const cityCoordinates = {
  İstanbul: [41.0082, 28.9784],
  Ankara: [39.9334, 32.8597],
  İzmir: [38.4237, 27.1428],
  Tokat: [40.3167, 36.55],
  Şanlıurfa: [37.1591, 38.7969],
  Bursa: [40.1885, 29.061],
  Balıkesir: [39.6484, 27.8826],
  Antalya: [36.8969, 30.7133],
  Trabzon: [41.0027, 39.7168],
  Erzurum: [39.9043, 41.2679],
  Diyarbakır: [37.9144, 40.2306],
  Gaziantep: [37.0662, 37.3833],
  Konya: [37.8746, 32.4932],
  Adana: [37.0, 35.3213],
  Eskişehir: [39.7767, 30.5206],
  Kayseri: [38.7205, 35.4826],
  Samsun: [41.2867, 36.33],
  Mardin: [37.3122, 40.735],
  Kocaeli: [40.7654, 29.9408],
  Sakarya: [40.7569, 30.3781],
  Sivas: [39.7477, 37.0179],
  Malatya: [38.3552, 38.3095],
  Mersin: [36.8121, 34.6415],
};

export const pointPresets = [
  { city: 'İstanbul', district: 'Ümraniye', pointName: 'Dudullu Otogarı', type: 'Otogar', lat: 41.025, lng: 29.12 },
  { city: 'İstanbul', district: 'Esenler', pointName: 'Esenler Otogarı', type: 'Otogar', lat: 41.0408, lng: 28.8947 },
  { city: 'İstanbul', district: 'Arnavutköy', pointName: 'İstanbul Havalimanı', type: 'Havalimanı', lat: 41.2619, lng: 28.7419 },
  { city: 'İstanbul', district: 'Pendik', pointName: 'Sabiha Gökçen', type: 'Havalimanı', lat: 40.8986, lng: 29.3092 },
  { city: 'Tokat', district: 'Merkez', pointName: 'Tokat Otogarı', type: 'Otogar', lat: 40.316, lng: 36.55 },
  { city: 'Şanlıurfa', district: 'Merkez', pointName: 'Şanlıurfa GAP Havalimanı', type: 'Havalimanı', lat: 37.4457, lng: 38.8956 },
  { city: 'Ankara', district: 'Çankaya', pointName: 'AŞTİ', type: 'Otogar', lat: 39.918, lng: 32.814 },
  { city: 'İzmir', district: 'Bornova', pointName: 'İzmir Otogarı', type: 'Otogar', lat: 38.449, lng: 27.213 },
  { city: 'Bursa', district: 'Osmangazi', pointName: 'Bursa Otogarı', type: 'Otogar', lat: 40.266, lng: 29.05 },
];

export const defaultTurkeyCenter = [39.0, 35.0];

export const getCityCoords = (city) => cityCoordinates[String(city || '').trim()] || defaultTurkeyCenter;

export const getStopCoords = (stops = []) => {
  const stopList = Array.isArray(stops) ? stops : String(stops || '').split(',');
  return stopList
    .map((stop) => {
      if (typeof stop === 'object') {
        return {
          name: [stop.city, stop.district, stop.pointName].filter(Boolean).join(' / '),
          coords: stop.lat && stop.lng ? [Number(stop.lat), Number(stop.lng)] : getCityCoords(stop.city),
        };
      }
      return { name: String(stop).trim(), coords: getCityCoords(stop) };
    })
    .filter((stop) => stop.name);
};

export const cityNames = Object.keys(cityCoordinates);
