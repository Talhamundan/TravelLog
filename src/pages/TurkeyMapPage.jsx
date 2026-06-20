// Türkiye il ziyaret haritası: şehir bazlı gidildi bilgisi ve kişisel notları yönetir.
import { CheckCircle2, Circle, MapPinned, Search, StickyNote, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { getMapTheme } from '../maps/mapThemes';
import turkeyProvinceGeoJson from '../data/turkeyProvinces.json';

const turkeyBounds = [
  [35.75, 25.55],
  [42.25, 44.85],
];

const provinceCoords = {
  '01': [37.0, 35.3213],
  '02': [37.7648, 38.2786],
  '03': [38.7569, 30.5387],
  '04': [39.7191, 43.0503],
  '05': [40.6533, 35.8331],
  '06': [39.9334, 32.8597],
  '07': [36.8969, 30.7133],
  '08': [41.1828, 41.8183],
  '09': [37.8444, 27.8458],
  '10': [39.6484, 27.8826],
  '11': [40.1426, 29.9793],
  '12': [38.8847, 40.4939],
  '13': [38.4006, 42.1095],
  '14': [40.7395, 31.6116],
  '15': [37.7203, 30.2908],
  '16': [40.1885, 29.061],
  '17': [40.1553, 26.4142],
  '18': [40.6013, 33.6134],
  '19': [40.5506, 34.9556],
  '20': [37.7765, 29.0864],
  '21': [37.9144, 40.2306],
  '22': [41.6771, 26.5557],
  '23': [38.6748, 39.2225],
  '24': [39.7468, 39.4911],
  '25': [39.9043, 41.2679],
  '26': [39.7767, 30.5206],
  '27': [37.0662, 37.3833],
  '28': [40.9128, 38.3895],
  '29': [40.4603, 39.4814],
  '30': [37.5744, 43.7408],
  '31': [36.2023, 36.1613],
  '32': [37.7648, 30.5566],
  '33': [36.8121, 34.6415],
  '34': [41.0082, 28.9784],
  '35': [38.4237, 27.1428],
  '36': [40.6013, 43.0975],
  '37': [41.3887, 33.7827],
  '38': [38.7205, 35.4826],
  '39': [41.7351, 27.2252],
  '40': [39.1461, 34.1595],
  '41': [40.7654, 29.9408],
  '42': [37.8746, 32.4932],
  '43': [39.4192, 29.9857],
  '44': [38.3552, 38.3095],
  '45': [38.6191, 27.4289],
  '46': [37.5753, 36.9228],
  '47': [37.3122, 40.735],
  '48': [37.2153, 28.3636],
  '49': [38.7432, 41.5065],
  '50': [38.6244, 34.7144],
  '51': [37.9667, 34.6833],
  '52': [40.9862, 37.8797],
  '53': [41.0255, 40.5177],
  '54': [40.7569, 30.3781],
  '55': [41.2867, 36.33],
  '56': [37.9274, 41.9423],
  '57': [42.0264, 35.1551],
  '58': [39.7477, 37.0179],
  '59': [40.9781, 27.511],
  '60': [40.3167, 36.55],
  '61': [41.0027, 39.7168],
  '62': [39.1083, 39.5482],
  '63': [37.1591, 38.7969],
  '64': [38.6823, 29.4082],
  '65': [38.5012, 43.3729],
  '66': [39.8181, 34.8147],
  '67': [41.4564, 31.7987],
  '68': [38.3687, 34.037],
  '69': [40.2552, 40.2249],
  '70': [37.1811, 33.215],
  '71': [39.8468, 33.5153],
  '72': [37.8812, 41.1351],
  '73': [37.519, 42.4537],
  '74': [41.5811, 32.461],
  '75': [41.1105, 42.7022],
  '76': [39.9237, 44.045],
  '77': [40.655, 29.2769],
  '78': [41.2061, 32.6204],
  '79': [36.7165, 37.1147],
  '80': [37.0746, 36.2478],
  '81': [40.8438, 31.1565],
};

const provinces = [
  { code: '22', name: 'Edirne', region: 'Marmara', x: 1, y: 2 },
  { code: '39', name: 'Kırklareli', region: 'Marmara', x: 2, y: 1 },
  { code: '59', name: 'Tekirdağ', region: 'Marmara', x: 2, y: 2 },
  { code: '34', name: 'İstanbul', region: 'Marmara', x: 3, y: 2 },
  { code: '77', name: 'Yalova', region: 'Marmara', x: 4, y: 3 },
  { code: '41', name: 'Kocaeli', region: 'Marmara', x: 4, y: 2 },
  { code: '54', name: 'Sakarya', region: 'Marmara', x: 5, y: 2 },
  { code: '81', name: 'Düzce', region: 'Karadeniz', x: 6, y: 2 },
  { code: '67', name: 'Zonguldak', region: 'Karadeniz', x: 7, y: 1 },
  { code: '74', name: 'Bartın', region: 'Karadeniz', x: 8, y: 1 },
  { code: '78', name: 'Karabük', region: 'Karadeniz', x: 8, y: 2 },
  { code: '37', name: 'Kastamonu', region: 'Karadeniz', x: 9, y: 1 },
  { code: '57', name: 'Sinop', region: 'Karadeniz', x: 10, y: 1 },
  { code: '55', name: 'Samsun', region: 'Karadeniz', x: 11, y: 1 },
  { code: '52', name: 'Ordu', region: 'Karadeniz', x: 12, y: 1 },
  { code: '28', name: 'Giresun', region: 'Karadeniz', x: 13, y: 1 },
  { code: '61', name: 'Trabzon', region: 'Karadeniz', x: 14, y: 1 },
  { code: '53', name: 'Rize', region: 'Karadeniz', x: 15, y: 1 },
  { code: '08', name: 'Artvin', region: 'Karadeniz', x: 16, y: 1 },
  { code: '11', name: 'Bilecik', region: 'Marmara', x: 5, y: 3 },
  { code: '14', name: 'Bolu', region: 'Karadeniz', x: 6, y: 3 },
  { code: '06', name: 'Ankara', region: 'İç Anadolu', x: 8, y: 4 },
  { code: '18', name: 'Çankırı', region: 'İç Anadolu', x: 9, y: 3 },
  { code: '19', name: 'Çorum', region: 'Karadeniz', x: 10, y: 3 },
  { code: '05', name: 'Amasya', region: 'Karadeniz', x: 11, y: 2 },
  { code: '60', name: 'Tokat', region: 'Karadeniz', x: 12, y: 3 },
  { code: '58', name: 'Sivas', region: 'İç Anadolu', x: 13, y: 4 },
  { code: '29', name: 'Gümüşhane', region: 'Karadeniz', x: 14, y: 2 },
  { code: '69', name: 'Bayburt', region: 'Karadeniz', x: 15, y: 2 },
  { code: '25', name: 'Erzurum', region: 'Doğu Anadolu', x: 16, y: 3 },
  { code: '75', name: 'Ardahan', region: 'Doğu Anadolu', x: 17, y: 2 },
  { code: '36', name: 'Kars', region: 'Doğu Anadolu', x: 17, y: 3 },
  { code: '17', name: 'Çanakkale', region: 'Marmara', x: 2, y: 4 },
  { code: '10', name: 'Balıkesir', region: 'Marmara', x: 3, y: 4 },
  { code: '16', name: 'Bursa', region: 'Marmara', x: 4, y: 4 },
  { code: '26', name: 'Eskişehir', region: 'İç Anadolu', x: 6, y: 4 },
  { code: '43', name: 'Kütahya', region: 'Ege', x: 5, y: 5 },
  { code: '03', name: 'Afyonkarahisar', region: 'Ege', x: 6, y: 6 },
  { code: '42', name: 'Konya', region: 'İç Anadolu', x: 8, y: 6 },
  { code: '71', name: 'Kırıkkale', region: 'İç Anadolu', x: 9, y: 4 },
  { code: '40', name: 'Kırşehir', region: 'İç Anadolu', x: 10, y: 5 },
  { code: '66', name: 'Yozgat', region: 'İç Anadolu', x: 11, y: 4 },
  { code: '50', name: 'Nevşehir', region: 'İç Anadolu', x: 11, y: 6 },
  { code: '38', name: 'Kayseri', region: 'İç Anadolu', x: 12, y: 6 },
  { code: '44', name: 'Malatya', region: 'Doğu Anadolu', x: 14, y: 6 },
  { code: '24', name: 'Erzincan', region: 'Doğu Anadolu', x: 14, y: 4 },
  { code: '62', name: 'Tunceli', region: 'Doğu Anadolu', x: 15, y: 5 },
  { code: '12', name: 'Bingöl', region: 'Doğu Anadolu', x: 16, y: 5 },
  { code: '49', name: 'Muş', region: 'Doğu Anadolu', x: 17, y: 5 },
  { code: '04', name: 'Ağrı', region: 'Doğu Anadolu', x: 18, y: 4 },
  { code: '76', name: 'Iğdır', region: 'Doğu Anadolu', x: 19, y: 4 },
  { code: '35', name: 'İzmir', region: 'Ege', x: 2, y: 6 },
  { code: '45', name: 'Manisa', region: 'Ege', x: 3, y: 6 },
  { code: '64', name: 'Uşak', region: 'Ege', x: 4, y: 6 },
  { code: '20', name: 'Denizli', region: 'Ege', x: 4, y: 7 },
  { code: '09', name: 'Aydın', region: 'Ege', x: 2, y: 7 },
  { code: '48', name: 'Muğla', region: 'Ege', x: 2, y: 8 },
  { code: '32', name: 'Isparta', region: 'Akdeniz', x: 6, y: 7 },
  { code: '15', name: 'Burdur', region: 'Akdeniz', x: 5, y: 8 },
  { code: '07', name: 'Antalya', region: 'Akdeniz', x: 7, y: 8 },
  { code: '70', name: 'Karaman', region: 'İç Anadolu', x: 9, y: 8 },
  { code: '68', name: 'Aksaray', region: 'İç Anadolu', x: 10, y: 7 },
  { code: '51', name: 'Niğde', region: 'İç Anadolu', x: 11, y: 8 },
  { code: '01', name: 'Adana', region: 'Akdeniz', x: 12, y: 8 },
  { code: '33', name: 'Mersin', region: 'Akdeniz', x: 10, y: 9 },
  { code: '80', name: 'Osmaniye', region: 'Akdeniz', x: 13, y: 8 },
  { code: '31', name: 'Hatay', region: 'Akdeniz', x: 14, y: 9 },
  { code: '46', name: 'Kahramanmaraş', region: 'Akdeniz', x: 14, y: 7 },
  { code: '02', name: 'Adıyaman', region: 'Güneydoğu', x: 15, y: 7 },
  { code: '23', name: 'Elazığ', region: 'Doğu Anadolu', x: 15, y: 6 },
  { code: '21', name: 'Diyarbakır', region: 'Güneydoğu', x: 17, y: 7 },
  { code: '13', name: 'Bitlis', region: 'Doğu Anadolu', x: 18, y: 6 },
  { code: '65', name: 'Van', region: 'Doğu Anadolu', x: 19, y: 6 },
  { code: '30', name: 'Hakkari', region: 'Doğu Anadolu', x: 20, y: 8 },
  { code: '27', name: 'Gaziantep', region: 'Güneydoğu', x: 15, y: 8 },
  { code: '79', name: 'Kilis', region: 'Güneydoğu', x: 15, y: 9 },
  { code: '63', name: 'Şanlıurfa', region: 'Güneydoğu', x: 16, y: 9 },
  { code: '47', name: 'Mardin', region: 'Güneydoğu', x: 18, y: 9 },
  { code: '72', name: 'Batman', region: 'Güneydoğu', x: 18, y: 8 },
  { code: '56', name: 'Siirt', region: 'Güneydoğu', x: 19, y: 8 },
  { code: '73', name: 'Şırnak', region: 'Güneydoğu', x: 19, y: 9 },
];

const filters = ['Tümü', 'Gidilen', 'Gidilmeyen', 'Notlu'];

export default function TurkeyMapPage({ trips = [], entries = [], onSaveProvince }) {
  const [selectedCode, setSelectedCode] = useState('34');
  const [focusMapOnSelection, setFocusMapOnSelection] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [query, setQuery] = useState('');
  const [mapTheme, setMapTheme] = useState(() => localStorage.getItem('travellog:mapTheme') || 'dark');
  const entryMap = useMemo(() => new Map(entries.map((item) => [item.code, item])), [entries]);
  const selectedProvince = provinces.find((province) => province.code === selectedCode) || provinces[0];
  const selectedEntry = entryMap.get(selectedProvince.code) || {};
  const [draft, setDraft] = useState({ visited: false, notes: '' });
  const tripCitySet = useMemo(() => buildTripCitySet(trips), [trips]);
  const visitedCount = provinces.filter((province) => entryMap.get(province.code)?.visited).length;
  const notedCount = provinces.filter((province) => entryMap.get(province.code)?.notes?.trim()).length;
  const progress = Math.round((visitedCount / provinces.length) * 100);

  useEffect(() => {
    setDraft({ visited: Boolean(selectedEntry.visited), notes: selectedEntry.notes || '' });
  }, [selectedCode, selectedEntry.notes, selectedEntry.visited]);

  useEffect(() => {
    localStorage.setItem('travellog:mapTheme', mapTheme);
  }, [mapTheme]);

  const visibleProvinces = provinces.filter((province) => {
    const entry = entryMap.get(province.code);
    const matchesQuery = normalizeText(`${province.name} ${province.region}`).includes(normalizeText(query));
    if (!matchesQuery) return false;
    if (activeFilter === 'Gidilen') return Boolean(entry?.visited);
    if (activeFilter === 'Gidilmeyen') return !entry?.visited;
    if (activeFilter === 'Notlu') return Boolean(entry?.notes?.trim());
    return true;
  });

  const saveSelected = (nextDraft = draft) => {
    onSaveProvince?.({
      id: selectedEntry.id,
      code: selectedProvince.code,
      name: selectedProvince.name,
      region: selectedProvince.region,
      visited: nextDraft.visited,
      notes: nextDraft.notes.trim(),
    });
  };

  const setVisited = (visited) => {
    const nextDraft = { ...draft, visited };
    setDraft(nextDraft);
    saveSelected(nextDraft);
  };

  const selectProvince = (code) => {
    setSelectedCode(code);
    setFocusMapOnSelection(true);
  };

  return (
    <div className="page-stack turkey-map-page">
      <section className="page-heading turkey-map-hero">
        <div>
          <h1>Türkiye Haritası</h1>
          <p>Gezdiğin şehirleri işaretle, gitmediklerini gör ve her il için kısa notlar tut.</p>
        </div>
        <div className="turkey-progress-ring" style={{ '--progress': `${progress}%` }}>
          <strong>{visitedCount}/81</strong>
          <span>%{progress}</span>
        </div>
      </section>

      <section className="turkey-kpi-grid">
        <TurkeyKpi icon={CheckCircle2} label="Gidilen şehir" value={visitedCount} tone="green" />
        <TurkeyKpi icon={XCircle} label="Gidilmeyen şehir" value={provinces.length - visitedCount} tone="red" />
        <TurkeyKpi icon={StickyNote} label="Not alınan şehir" value={notedCount} tone="amber" />
        <TurkeyKpi icon={MapPinned} label="Seyahatlerde görünen" value={tripCitySet.size} tone="blue" />
      </section>

      <section className="turkey-map-layout">
        <div className="turkey-map-main">
          <section className="panel turkey-map-toolbar">
            <label className="turkey-map-search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="İl veya bölge ara..." />
            </label>
            <div className="turkey-toolbar-actions">
              <div className="turkey-map-tabs">
                {filters.map((filter) => (
                  <button key={filter} type="button" className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>
                    {filter}
                  </button>
                ))}
              </div>
              <div className="map-theme-toggle turkey-theme-toggle" aria-label="Harita teması">
                {[
                  ['dark', 'Dark'],
                  ['light', 'Light'],
                  ['minimal', 'Minimal'],
                ].map(([value, label]) => (
                  <button type="button" key={value} className={mapTheme === value ? 'active' : ''} onClick={() => setMapTheme(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="panel turkey-map-board turkey-real-map-board" aria-label="Türkiye şehir haritası">
            <TurkeyProvinceMap
              provinces={provinces}
              visibleProvinces={visibleProvinces}
              entryMap={entryMap}
              selectedCode={selectedCode}
              focusMapOnSelection={focusMapOnSelection}
              theme={mapTheme}
              tripCitySet={tripCitySet}
              onSelect={selectProvince}
            />
          </section>
        </div>

        <aside className="panel turkey-province-panel">
          <div className="turkey-province-head">
            <span>{selectedProvince.code}</span>
            <div>
              <h2>{selectedProvince.name}</h2>
              <small>{selectedProvince.region}</small>
            </div>
          </div>

          <div className="turkey-visit-toggle">
            <button type="button" className={draft.visited ? 'active' : ''} onClick={() => setVisited(true)}>
              <CheckCircle2 size={17} />
              Gittik
            </button>
            <button type="button" className={!draft.visited ? 'active' : ''} onClick={() => setVisited(false)}>
              <Circle size={17} />
              Gitmedik
            </button>
          </div>

          <label className="turkey-note-field">
            <span>Şehir notu</span>
            <textarea
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Nerelere gittik, nereler kaldı, tekrar gidilecek yerler..."
              rows={8}
            />
          </label>

          <button type="button" className="primary-button turkey-save-button" onClick={() => saveSelected()}>
            <StickyNote size={17} />
            Notu Kaydet
          </button>

          <div className="turkey-province-meta">
            <span>{tripCitySet.has(normalizeText(selectedProvince.name)) ? 'Seyahat kayıtlarında geçiyor' : 'Seyahat kayıtlarında görünmüyor'}</span>
            <span>{selectedEntry?.notes?.trim() ? 'Not kaydedildi' : 'Not yok'}</span>
          </div>
        </aside>
      </section>
    </div>
  );
}

function TurkeyProvinceMap({ provinces, visibleProvinces, entryMap, selectedCode, focusMapOnSelection, theme, tripCitySet, onSelect }) {
  const themeConfig = getMapTheme(theme);
  const visibleCodes = useMemo(() => new Set(visibleProvinces.map((province) => province.code)), [visibleProvinces]);
  const selectedProvince = provinces.find((province) => province.code === selectedCode);
  const provinceByName = useMemo(() => {
    const map = new Map(provinces.map((province) => [normalizeText(province.name), province]));
    map.set(normalizeText('Afyon'), provinces.find((province) => province.code === '03'));
    return map;
  }, [provinces]);

  return (
    <MapContainer
      bounds={turkeyBounds}
      zoom={6}
      minZoom={5.25}
      maxBounds={turkeyBounds}
      maxBoundsViscosity={0.85}
      zoomSnap={0.25}
      zoomDelta={0.5}
      className={`trip-map dashboard-map turkey-leaflet-map map-theme-${themeConfig.id}`}
      scrollWheelZoom
    >
      <TileLayer attribution={themeConfig.attribution} url={themeConfig.tileUrl} />
      <TurkeyMapInvalidator />
      <TurkeyMapFocus province={focusMapOnSelection ? selectedProvince : null} geoJson={turkeyProvinceGeoJson} />
      <GeoJSON
        key={`${theme}-${selectedCode}-${visibleProvinces.map((province) => province.code).join('-')}-${[...entryMap.values()].map((entry) => `${entry.code}:${entry.visited ? 1 : 0}`).join('|')}`}
        data={turkeyProvinceGeoJson}
        style={(feature) => getProvinceStyle(feature, { entryMap, provinceByName, selectedCode, tripCitySet, visibleCodes })}
        onEachFeature={(feature, layer) => {
          const province = provinceByName.get(normalizeText(feature.properties?.name));
          if (!province) return;
          const entry = entryMap.get(province.code);
          layer.on({
            click: () => onSelect(province.code),
            mouseover: () => layer.setStyle({ weight: 3, fillOpacity: 0.78 }),
            mouseout: () => layer.setStyle(getProvinceStyle(feature, { entryMap, provinceByName, selectedCode, tripCitySet, visibleCodes })),
          });
          layer.bindTooltip(`${province.name} · ${entry?.visited ? 'Gidildi' : 'Gidilmedi'}`, { direction: 'top', opacity: 1, sticky: true });
          layer.bindPopup(() => {
            const popup = document.createElement('div');
            popup.className = 'location-popup-card turkey-popup-card';
            popup.innerHTML = `<strong>${province.name}</strong><span>${province.region}</span><small>${entry?.visited ? 'Gidildi' : 'Henüz gidilmedi'}</small>`;
            return popup;
          });
        }}
      />
      {provinces.map((province) => {
        const entry = entryMap.get(province.code);
        const visible = visibleCodes.has(province.code);
        const selected = selectedCode === province.code;
        return (
          <Tooltip
            key={`label-${province.code}`}
            permanent
            direction="center"
            opacity={visible ? 1 : 0.18}
            position={provinceCoords[province.code]}
            className={[
              'turkey-province-label',
              entry?.visited ? 'visited' : '',
              selected ? 'selected' : '',
            ].filter(Boolean).join(' ')}
          >
            {province.name}
          </Tooltip>
        );
      })}
    </MapContainer>
  );
}

function getProvinceStyle(feature, { entryMap, provinceByName, selectedCode, tripCitySet, visibleCodes }) {
  const province = provinceByName.get(normalizeText(feature.properties?.name));
  const entry = province ? entryMap.get(province.code) : null;
  const selected = province?.code === selectedCode;
  const visible = province ? visibleCodes.has(province.code) : true;
  const seenInTrips = province ? tripCitySet.has(normalizeText(province.name)) : false;
  const fillColor = entry?.visited ? '#22c55e' : seenInTrips ? '#facc15' : '#38bdf8';
  return {
    color: selected ? '#ffffff' : entry?.visited ? '#86efac' : '#bae6fd',
    fillColor,
    fillOpacity: visible ? (entry?.visited ? 0.68 : seenInTrips ? 0.46 : 0.28) : 0.06,
    opacity: visible ? 1 : 0.2,
    weight: selected ? 3 : 1.4,
    dashArray: selected ? '' : '2 3',
  };
}

function TurkeyMapInvalidator() {
  const map = useMap();
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const timer = window.setTimeout(() => map.invalidateSize({ animate: false }), 240);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [map]);
  return null;
}

function TurkeyMapFocus({ province, geoJson }) {
  const map = useMap();
  useEffect(() => {
    if (!province) {
      map.fitBounds(turkeyBounds, { padding: [4, 4], animate: false });
      return;
    }
    const feature = geoJson.features.find((item) => normalizeText(item.properties?.name) === normalizeText(province.name));
    const bounds = getFeatureBounds(feature);
    if (bounds) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 8, animate: true });
    else map.setView(provinceCoords[province.code], Math.max(map.getZoom(), 7), { animate: true });
  }, [geoJson, map, province]);
  return null;
}

function getFeatureBounds(feature) {
  if (!feature?.geometry?.coordinates) return null;
  const coords = [];
  collectCoordinates(feature.geometry.coordinates, coords);
  if (!coords.length) return null;
  return coords.reduce(
    (bounds, [lng, lat]) => [
      [Math.min(bounds[0][0], lat), Math.min(bounds[0][1], lng)],
      [Math.max(bounds[1][0], lat), Math.max(bounds[1][1], lng)],
    ],
    [[90, 180], [-90, -180]],
  );
}

function collectCoordinates(value, coords) {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === 'number' && typeof value[1] === 'number') {
    coords.push(value);
    return;
  }
  value.forEach((item) => collectCoordinates(item, coords));
}

function TurkeyKpi({ icon: Icon, label, value, tone }) {
  return (
    <article className={`turkey-kpi-card ${tone}`}>
      <span><Icon size={18} /></span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </article>
  );
}

function buildTripCitySet(trips) {
  const citySet = new Set();
  const provinceNames = new Set(provinces.map((province) => normalizeText(province.name)));
  trips.forEach((trip) => {
    [trip.from, trip.to, trip.city, trip.destination, trip.title].filter(Boolean).forEach((value) => {
      const normalized = normalizeText(String(value));
      provinceNames.forEach((provinceName) => {
        if (normalized.includes(provinceName)) citySet.add(provinceName);
      });
    });
  });
  return citySet;
}

function normalizeText(value = '') {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
}
