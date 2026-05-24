// Eski string lokasyonlar ile yeni il/ilçe/nokta objelerini ortak biçimde okur.
export const locationCity = (value) => (typeof value === 'string' ? value : value?.city || '');

export const locationLabel = (value) => {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return [value.city, value.district, value.pointName].filter(Boolean).join(' / ') || '-';
};

export const routeLabel = (trip) => `${locationLabel(trip.from)} → ${locationLabel(trip.to)}`;

export const locationCoords = (value) => {
  if (value?.lat && value?.lng) return [Number(value.lat), Number(value.lng)];
  return null;
};
