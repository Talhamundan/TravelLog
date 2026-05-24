// Demo modunda Firestore davranışını taklit eden küçük localStorage katmanı.
import { demoTrips } from '../data/demoData';
import { DEFAULT_COMPANIES } from '../constants/travel';

const seed = {
  trips: demoTrips,
  companies: DEFAULT_COMPANIES.map((name, index) => ({ id: `company-${index}`, userId: 'demo-user', name })),
  vehicles: [{ id: 'car-1', userId: 'demo-user', name: '34 TL 2026', plate: '34 TL 2026', notes: 'Kişisel araç' }],
  expenses: [],
  settings: [],
};

const read = (collectionName) => {
  const raw = localStorage.getItem(`travellog:${collectionName}`);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(`travellog:${collectionName}`, JSON.stringify(seed[collectionName] || []));
  return seed[collectionName] || [];
};

const write = (collectionName, data) => localStorage.setItem(`travellog:${collectionName}`, JSON.stringify(data));

export const localStore = {
  list(collectionName, userId) {
    return read(collectionName).filter((item) => item.userId === userId);
  },
  create(collectionName, payload) {
    const items = read(collectionName);
    const now = new Date().toISOString();
    const item = { ...payload, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    write(collectionName, [item, ...items]);
    return item;
  },
  update(collectionName, id, payload, userId) {
    const items = read(collectionName);
    const next = items.map((item) =>
      item.id === id && item.userId === userId ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item,
    );
    write(collectionName, next);
    return next.find((item) => item.id === id && item.userId === userId);
  },
  remove(collectionName, id, userId) {
    write(collectionName, read(collectionName).filter((item) => !(item.id === id && item.userId === userId)));
  },
};
