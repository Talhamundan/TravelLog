// Tek inputlu koyu tema lokasyon autocomplete bileşeni.
import { MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cityLocationFromText, travelLocations } from '../../utils/locations';

export default function LocationAutocomplete({ label, value, location, savedLocations = [], onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const query = String(value || '');
  const suggestions = useMemo(() => {
    const normalized = query.toLocaleLowerCase('tr-TR').trim();
    const allLocations = [...normalizeSavedLocations(savedLocations), ...travelLocations];
    if (!normalized) return allLocations.slice(0, 6);
    const cityLocation = cityLocationFromText(query);
    const matches = allLocations
      .filter((item) =>
        [item.name, item.city, item.district, item.type, ...(item.aliases || [])]
          .filter(Boolean)
          .some((part) => part.toLocaleLowerCase('tr-TR').includes(normalized)),
      )
      .slice(0, 6);
    return cityLocation ? [cityLocation, ...matches.filter((item) => item.name !== cityLocation.name)].slice(0, 6) : matches;
  }, [query, savedLocations]);

  return (
    <label className="field location-autocomplete">
      <span>{label}</span>
      <div className="location-input-wrap">
        <Search size={15} />
        <input
          value={query}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onChange={(event) => onChange(event.target.value, null)}
        />
      </div>
      {focused && suggestions.length > 0 && (
        <div className="location-suggestions" onMouseDown={(event) => event.preventDefault()}>
          {suggestions.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                onChange(item.name, item);
                setFocused(false);
              }}
            >
              <MapPin size={15} />
              <span>{item.name}</span>
              <small>{item.type}</small>
            </button>
          ))}
        </div>
      )}
      {location?.lat && <small className="location-lock">Konum bulundu ({location.provider || 'local'}): {Number(location.lat).toFixed(3)}, {Number(location.lng).toFixed(3)}</small>}
    </label>
  );
}

function normalizeSavedLocations(items = []) {
  return items.map((item) => ({
    ...item,
    name: item.name || item.label || item.title || 'Kayıtlı konum',
    city: item.city || '',
    district: item.district || '',
    type: item.type || 'Kayıtlı',
    lat: Number(item.lat),
    lng: Number(item.lng),
    aliases: [item.shortName, item.label, item.notes].filter(Boolean),
    provider: item.provider || 'saved',
  })).filter((item) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
