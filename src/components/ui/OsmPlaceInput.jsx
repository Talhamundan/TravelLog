import { MapPin, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { geocodeOsmPlace } from '../../services/osmRouteService';
import { cityLocationFromText, travelLocations } from '../../utils/locations';

export default function OsmPlaceInput({ label, value, selectedPlace, savedLocations = [], placeholder, onChange, onPlaceSelect, required = false }) {
  const [text, setText] = useState(value || selectedPlace?.name || '');
  const [focused, setFocused] = useState(false);
  const [remoteResults, setRemoteResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setText(value || selectedPlace?.name || '');
  }, [selectedPlace?.name, value]);

  useEffect(() => {
    const query = text.trim();
    if (!focused || query.length < 3) {
      setRemoteResults([]);
      return undefined;
    }
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        setRemoteResults(await geocodeOsmPlace(query));
      } catch (error) {
        console.warn('OpenStreetMap place search error', error);
        setRemoteResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [focused, text]);

  const localSuggestions = useMemo(() => {
    const normalized = text.toLocaleLowerCase('tr-TR').trim();
    const all = [...normalizeSavedLocations(savedLocations), ...travelLocations];
    if (!normalized) return all.slice(0, 4);
    const cityLocation = cityLocationFromText(text);
    const matches = all
      .filter((item) => [item.name, item.city, item.district, item.type, ...(item.aliases || [])].filter(Boolean).some((part) => part.toLocaleLowerCase('tr-TR').includes(normalized)))
      .slice(0, 4);
    return cityLocation ? [cityLocation, ...matches.filter((item) => item.name !== cityLocation.name)].slice(0, 4) : matches;
  }, [savedLocations, text]);

  const suggestions = [...localSuggestions, ...remoteResults].filter((item, index, list) => list.findIndex((other) => `${other.lat},${other.lng}` === `${item.lat},${item.lng}`) === index).slice(0, 8);
  const invalid = required && touched && text && !selectedPlace?.lat;
  const showSuggestions = focused && (suggestions.length > 0 || loading);

  const selectPlace = (place) => {
    setText(place.name || place.formattedAddress || '');
    setFocused(false);
    setTouched(false);
    onPlaceSelect?.(place);
  };

  return (
    <label className={`osm-place-field ${invalid ? 'invalid' : ''}`}>
      {label && <span>{label}</span>}
      <div className="place-input-shell">
        <Search size={17} />
        <input
          value={text}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTouched(true);
            window.setTimeout(() => setFocused(false), 120);
          }}
          onChange={(event) => {
            setText(event.target.value);
            onChange?.(event.target.value);
          }}
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('');
              setTouched(false);
              onChange?.('');
              onPlaceSelect?.(null);
            }}
            aria-label="Temizle"
          >
            <X size={15} />
          </button>
        )}
      </div>
      {showSuggestions && (
        <div className="location-suggestions osm-suggestions" onMouseDown={(event) => event.preventDefault()}>
          {suggestions.map((item) => (
            <button key={`${item.provider || 'local'}-${item.placeId || item.name}-${item.lat}-${item.lng}`} type="button" onClick={() => selectPlace(item)}>
              <MapPin size={15} />
              <span>{item.name}</span>
              <small>{item.formattedAddress || [item.district, item.city, item.type].filter(Boolean).join(' · ') || item.provider}</small>
            </button>
          ))}
          {loading && <span className="osm-loading">OpenStreetMap aranıyor...</span>}
        </div>
      )}
      {invalid && <small>Lütfen listeden koordinatı olan bir konum seçin.</small>}
      {selectedPlace?.lat && <small className="location-lock">Konum seçildi ({selectedPlace.provider || 'osm'}): {Number(selectedPlace.lat).toFixed(4)}, {Number(selectedPlace.lng).toFixed(4)}</small>}
    </label>
  );
}

function normalizeSavedLocations(items = []) {
  return items
    .map((item) => ({
      ...item,
      name: item.name || item.label || item.title || 'Kayıtlı konum',
      formattedAddress: item.formattedAddress || item.notes || '',
      city: item.city || '',
      district: item.district || '',
      type: item.type || 'Kayıtlı',
      lat: Number(item.lat),
      lng: Number(item.lng),
      aliases: [item.shortName, item.label, item.notes].filter(Boolean),
      provider: item.provider || 'saved',
    }))
    .filter((item) => item.name && Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
