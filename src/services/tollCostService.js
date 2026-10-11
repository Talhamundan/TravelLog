import { bridgeTollTariffs, tollSources } from '../data/tollTariffs';

export const KGM_TOLL_SOURCE = tollSources.kgmMain;

export function calculateRouteTolls({ route, hgsClass, manualTollAmount = 0, avoidTolls = false }) {
  const vehicleClass = normalizeHgsClass(hgsClass);
  const manualAmount = toNumber(manualTollAmount);
  const verifiedItems = vehicleClass ? findVerifiedBridgeTolls(route, vehicleClass) : [];
  const unresolvedItems = detectUnresolvedTollHints(route, verifiedItems, vehicleClass, avoidTolls);
  const items = [...verifiedItems, ...unresolvedItems];

  if (manualAmount > 0) {
    items.push({
      id: 'manual-toll',
      roadId: '',
      name: 'Manuel geçiş ücreti',
      entry: '',
      exit: '',
      hgsClass: vehicleClass,
      status: 'Tahmini',
      amount: manualAmount,
      source: { name: 'Kullanıcı girişi', url: '', validFrom: '' },
      note: 'Kullanıcının hesaplama anında eklediği ücret.',
    });
  }

  return {
    hgsClass: vehicleClass,
    knownAmount: items.reduce((sum, item) => sum + toNumber(item.amount), 0),
    hasUnresolved: items.some((item) => item.status === 'Hesaplanamadı'),
    items,
  };
}

function findVerifiedBridgeTolls(route, vehicleClass) {
  const path = route?.overviewPath || [];
  if (path.length < 2) return [];
  return bridgeTollTariffs
    .filter((tariff) => routeUsesBridge(path, tariff.match))
    .map((tariff) => ({
      id: tariff.id,
      roadId: tariff.roadId,
      name: tariff.name,
      entry: tariff.entry,
      exit: tariff.exit,
      hgsClass: vehicleClass,
      status: 'Doğrulanmış',
      amount: tariff.pricesByClass[vehicleClass] || 0,
      source: tariff.source,
      note: 'Rota geometrisi köprü segmentini kesiyor; ücret resmi KGM köprü tarifesinden alındı.',
    }))
    .filter((item) => item.amount > 0);
}

function detectUnresolvedTollHints(route, verifiedItems, vehicleClass, avoidTolls) {
  const text = routeStepText(route);
  const verifiedRoads = new Set(verifiedItems.flatMap((item) => [item.id, item.roadId, item.name.toLocaleLowerCase('tr-TR')]));
  const hints = [
    { id: 'yss', roadId: 'O-7', name: 'Yavuz Sultan Selim Köprüsü / Kuzey Marmara', keywords: ['yavuz sultan selim', 'kuzey marmara', 'o-7'] },
    { id: 'goi-otoyol', roadId: 'O-5', name: 'Gebze-Orhangazi-İzmir Otoyolu kesimi', keywords: ['o-5'] },
    { id: 'malkara-canakkale', roadId: 'O-6', name: 'Malkara-Çanakkale Otoyolu kesimi', keywords: ['o-6'] },
    { id: 'avrasya', roadId: '', name: 'Avrasya Tüneli', keywords: ['avrasya'] },
    { id: 'kgm-otoyol', roadId: '', name: 'KGM otoyol kesimi', keywords: ['otoyolu', 'otoyol'] },
  ];

  const unresolved = hints
    .filter((hint) => !verifiedRoads.has(hint.id) && !verifiedRoads.has(hint.roadId) && hint.keywords.some((keyword) => text.includes(keyword)))
    .map((hint) => ({
      id: hint.id,
      roadId: hint.roadId,
      name: hint.name,
      entry: '',
      exit: '',
      hgsClass: vehicleClass,
      status: 'Hesaplanamadı',
      amount: 0,
      source: KGM_TOLL_SOURCE,
      note: 'Ücretli kesim işareti var; giriş/çıkış gişesi veya tarife matrisi güvenilir eşleşmediği için otomatik ücret yazılmadı.',
    }));

  if (!unresolved.length && !verifiedItems.length && !avoidTolls) {
    unresolved.push({
      id: 'toll-unknown',
      roadId: '',
      name: 'Otoyol/köprü kontrolü',
      entry: '',
      exit: '',
      hgsClass: vehicleClass,
      status: 'Hesaplanamadı',
      amount: 0,
      source: KGM_TOLL_SOURCE,
      note: vehicleClass ? 'Bu rota için doğrulanmış geçiş eşleşmesi bulunamadı. Geçiş ücreti varsa manuel ekleyin.' : 'HGS sınıfı seçilmeden otomatik ücret hesaplanamaz.',
    });
  }

  return dedupeById(unresolved);
}

function routeUsesBridge(path, match) {
  const [a, b] = match.endpoints;
  const tolerance = match.toleranceMeters || 1000;
  let nearA = false;
  let nearB = false;
  let crossesSegment = false;

  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    if (distanceMeters(point, a) <= tolerance) nearA = true;
    if (distanceMeters(point, b) <= tolerance) nearB = true;
    if (index > 0 && segmentDistanceMeters(path[index - 1], point, a, b) <= tolerance) crossesSegment = true;
    if ((nearA && nearB) || crossesSegment) return true;
  }
  return false;
}

function routeStepText(route) {
  return (route?.legs || [])
    .flatMap((leg) => leg.steps || [])
    .map((step) => [step.name, step.ref].filter(Boolean).join(' '))
    .join(' ')
    .toLocaleLowerCase('tr-TR');
}

function segmentDistanceMeters(routeA, routeB, bridgeA, bridgeB) {
  return Math.min(
    pointToSegmentMeters(bridgeA, routeA, routeB),
    pointToSegmentMeters(bridgeB, routeA, routeB),
    pointToSegmentMeters(routeA, bridgeA, bridgeB),
    pointToSegmentMeters(routeB, bridgeA, bridgeB),
  );
}

function pointToSegmentMeters(point, a, b) {
  const p = project(point);
  const start = project(a);
  const end = project(b);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (!dx && !dy) return distanceMeters(point, a);
  const t = Math.max(0, Math.min(1, ((p.x - start.x) * dx + (p.y - start.y) * dy) / (dx * dx + dy * dy)));
  const closest = { x: start.x + t * dx, y: start.y + t * dy };
  return Math.hypot(p.x - closest.x, p.y - closest.y);
}

function project(point) {
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  const meanLat = lat * Math.PI / 180;
  return {
    x: lng * 111320 * Math.cos(meanLat),
    y: lat * 110540,
  };
}

function distanceMeters(a, b) {
  const earthRadius = 6371000;
  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLat = lat2 - lat1;
  const dLng = (Number(b.lng) - Number(a.lng)) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function dedupeById(items) {
  return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index);
}

function normalizeHgsClass(value) {
  const number = Number.parseInt(value, 10);
  return number >= 1 && number <= 6 ? number : null;
}

function toNumber(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}
