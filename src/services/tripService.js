// Firestore ana veritabanı servisleri; config yoksa aynı API localStorage'a düşer.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, hasFirebaseConfig } from '../config/firebase';
import { localStore } from './localStore';
import { normalizeTripPayload } from '../utils/tripCalculations';

const collectionNames = {
  trips: 'trips',
  companies: 'companies',
  vehicles: 'vehicles',
  expenses: 'expenses',
  settings: 'settings',
};

const demoSeedTrips = [
  {
    title: 'İstanbul → Tokat araç seyahati',
    from: 'İstanbul',
    to: 'Tokat',
    transportType: 'Araç',
    company: 'Kişisel Araç',
    date: '2026-01-12',
    departureTime: '08:00',
    arrivalTime: '17:30',
    durationMinutes: 570,
    distanceKm: 780,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 2100,
    roadCost: 420,
    bridgeCost: 130,
    parkingCost: 0,
    otherCost: 100,
    totalCost: 2750,
    notes: 'Demo kayıt: İstanbul Tokat araç yolculuğu.',
  },
  {
    title: 'Tokat → İstanbul otobüs seyahati',
    from: 'Tokat',
    to: 'İstanbul',
    transportType: 'Otobüs',
    company: 'Metro Turizm',
    date: '2026-01-18',
    departureTime: '22:00',
    arrivalTime: '08:30',
    durationMinutes: 630,
    distanceKm: 780,
    ticketPrice: 900,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 900,
    notes: 'Demo kayıt: gece otobüsü.',
  },
  {
    title: 'İstanbul → Şanlıurfa uçuşu',
    from: 'İstanbul',
    to: 'Şanlıurfa',
    transportType: 'Uçak',
    company: 'AJet',
    date: '2026-02-05',
    departureTime: '11:15',
    arrivalTime: '13:05',
    durationMinutes: 110,
    distanceKm: 1150,
    ticketPrice: 2300,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 2300,
    notes: 'Demo kayıt: AJet uçuşu.',
  },
  {
    title: 'Şanlıurfa → İstanbul uçuşu',
    from: 'Şanlıurfa',
    to: 'İstanbul',
    transportType: 'Uçak',
    company: 'THY',
    date: '2026-02-09',
    departureTime: '19:20',
    arrivalTime: '21:10',
    durationMinutes: 110,
    distanceKm: 1150,
    ticketPrice: 3200,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 3200,
    notes: 'Demo kayıt: THY dönüş uçuşu.',
  },
  {
    title: 'İstanbul → Ankara YHT',
    from: 'İstanbul',
    to: 'Ankara',
    transportType: 'Tren',
    company: 'YHT',
    date: '2026-03-14',
    departureTime: '09:30',
    arrivalTime: '14:05',
    durationMinutes: 275,
    distanceKm: 450,
    ticketPrice: 430,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 430,
    notes: 'Demo kayıt: yüksek hızlı tren.',
  },
  {
    title: 'Ankara → İstanbul araç seyahati',
    from: 'Ankara',
    to: 'İstanbul',
    transportType: 'Araç',
    company: 'Kişisel Araç',
    date: '2026-03-16',
    departureTime: '15:00',
    arrivalTime: '20:20',
    durationMinutes: 320,
    distanceKm: 450,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 1320,
    roadCost: 280,
    bridgeCost: 100,
    parkingCost: 0,
    otherCost: 100,
    totalCost: 1800,
    notes: 'Demo kayıt: Ankara dönüşü.',
  },
  {
    title: 'İstanbul → İzmir uçuşu',
    from: 'İstanbul',
    to: 'İzmir',
    transportType: 'Uçak',
    company: 'THY',
    date: '2026-04-02',
    departureTime: '07:40',
    arrivalTime: '08:45',
    durationMinutes: 65,
    distanceKm: 328,
    ticketPrice: 1850,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 1850,
    notes: 'Demo kayıt: İzmir iş seyahati.',
  },
  {
    title: 'İzmir → Balıkesir otobüs',
    from: 'İzmir',
    to: 'Balıkesir',
    transportType: 'Otobüs',
    company: 'Pamukkale',
    date: '2026-04-04',
    departureTime: '13:00',
    arrivalTime: '16:10',
    durationMinutes: 190,
    distanceKm: 180,
    ticketPrice: 360,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 360,
    notes: 'Demo kayıt: Ege iç rotası.',
  },
  {
    title: 'Balıkesir → Bursa araç',
    from: 'Balıkesir',
    to: 'Bursa',
    transportType: 'Araç',
    company: 'Kişisel Araç',
    date: '2026-04-06',
    departureTime: '10:20',
    arrivalTime: '12:40',
    durationMinutes: 140,
    distanceKm: 155,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 620,
    roadCost: 110,
    bridgeCost: 0,
    parkingCost: 80,
    otherCost: 40,
    totalCost: 850,
    notes: 'Demo kayıt: kısa araç rotası.',
  },
  {
    title: 'Bursa → İstanbul feribot',
    from: 'Bursa',
    to: 'İstanbul',
    transportType: 'Feribot',
    company: 'İDO',
    date: '2026-04-07',
    departureTime: '18:00',
    arrivalTime: '19:50',
    durationMinutes: 110,
    distanceKm: 95,
    ticketPrice: 420,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 420,
    notes: 'Demo kayıt: deniz ulaşımı.',
  },
  {
    title: 'İstanbul → Antalya uçuşu',
    from: 'İstanbul',
    to: 'Antalya',
    transportType: 'Uçak',
    company: 'Pegasus',
    date: '2026-05-10',
    departureTime: '09:15',
    arrivalTime: '10:35',
    durationMinutes: 80,
    distanceKm: 480,
    ticketPrice: 1650,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 1650,
    notes: 'Demo kayıt: Antalya uçuşu.',
  },
  {
    title: 'Antalya → Konya araç',
    from: 'Antalya',
    to: 'Konya',
    stops: ['Isparta'],
    transportType: 'Araç',
    company: 'Kişisel Araç',
    date: '2026-05-13',
    departureTime: '11:00',
    arrivalTime: '15:20',
    durationMinutes: 260,
    distanceKm: 300,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 980,
    roadCost: 160,
    bridgeCost: 0,
    parkingCost: 60,
    otherCost: 70,
    totalCost: 1270,
    notes: 'Demo kayıt: İç Anadolu geçişi.',
  },
  {
    title: 'Konya → Adana tren',
    from: 'Konya',
    to: 'Adana',
    transportType: 'Tren',
    company: 'TCDD',
    date: '2026-05-16',
    departureTime: '08:10',
    arrivalTime: '13:45',
    durationMinutes: 335,
    distanceKm: 350,
    ticketPrice: 520,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 520,
    notes: 'Demo kayıt: tren rotası.',
  },
  {
    title: 'Adana → Gaziantep otobüs',
    from: 'Adana',
    to: 'Gaziantep',
    transportType: 'Otobüs',
    company: 'Kamil Koç',
    date: '2026-06-03',
    departureTime: '12:30',
    arrivalTime: '15:00',
    durationMinutes: 150,
    distanceKm: 225,
    ticketPrice: 390,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 390,
    notes: 'Demo kayıt: Güneydoğu otobüs.',
  },
  {
    title: 'Gaziantep → Şanlıurfa araç',
    from: 'Gaziantep',
    to: 'Şanlıurfa',
    transportType: 'Araç',
    company: 'Kişisel Araç',
    date: '2026-06-05',
    departureTime: '16:00',
    arrivalTime: '18:15',
    durationMinutes: 135,
    distanceKm: 150,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 540,
    roadCost: 90,
    bridgeCost: 0,
    parkingCost: 40,
    otherCost: 30,
    totalCost: 700,
    notes: 'Demo kayıt: kısa bölge rotası.',
  },
  {
    title: 'Şanlıurfa → Diyarbakır otobüs',
    from: 'Şanlıurfa',
    to: 'Diyarbakır',
    transportType: 'Otobüs',
    company: 'Metro Turizm',
    date: '2026-06-07',
    departureTime: '09:00',
    arrivalTime: '11:30',
    durationMinutes: 150,
    distanceKm: 180,
    ticketPrice: 310,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 310,
    notes: 'Demo kayıt: Diyarbakır bağlantısı.',
  },
  {
    title: 'Diyarbakır → Erzurum uçuşu',
    from: 'Diyarbakır',
    to: 'Erzurum',
    transportType: 'Uçak',
    company: 'AJet',
    date: '2026-07-12',
    departureTime: '14:20',
    arrivalTime: '15:35',
    durationMinutes: 75,
    distanceKm: 330,
    ticketPrice: 1450,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 1450,
    notes: 'Demo kayıt: doğu uçuşu.',
  },
  {
    title: 'Erzurum → Trabzon araç',
    from: 'Erzurum',
    to: 'Trabzon',
    transportType: 'Araç',
    company: 'Kiralık Araç',
    date: '2026-07-15',
    departureTime: '10:00',
    arrivalTime: '15:10',
    durationMinutes: 310,
    distanceKm: 300,
    ticketPrice: 0,
    currency: 'TRY',
    fuelCost: 1120,
    roadCost: 130,
    bridgeCost: 0,
    parkingCost: 90,
    otherCost: 160,
    totalCost: 1500,
    notes: 'Demo kayıt: dağ yolu.',
  },
  {
    title: 'Trabzon → İstanbul uçuşu',
    from: 'Trabzon',
    to: 'İstanbul',
    transportType: 'Uçak',
    company: 'THY',
    date: '2026-07-18',
    departureTime: '20:30',
    arrivalTime: '22:20',
    durationMinutes: 110,
    distanceKm: 900,
    ticketPrice: 2600,
    currency: 'TRY',
    fuelCost: 0,
    roadCost: 0,
    bridgeCost: 0,
    parkingCost: 0,
    otherCost: 0,
    totalCost: 2600,
    notes: 'Demo kayıt: Karadeniz dönüşü.',
  },
];

const sortTrips = (trips) => trips.sort((a, b) => String(b.date).localeCompare(String(a.date)));

const generatedDemoTrips = Array.from({ length: 16 }, (_, index) => {
  const routes = [
    ['İstanbul', 'Kocaeli', 'Araç', 'Kişisel Araç', 110, 620],
    ['Sakarya', 'Ankara', 'Otobüs', 'Kamil Koç', 310, 520],
    ['Kayseri', 'Sivas', 'Tren', 'TCDD', 195, 340],
    ['Malatya', 'Diyarbakır', 'Otobüs', 'Metro Turizm', 250, 410],
    ['Mersin', 'Adana', 'Araç', 'Kiralık Araç', 85, 380],
    ['İstanbul', 'Samsun', 'Uçak', 'AJet', 620, 1750],
    ['İzmir', 'İstanbul', 'Uçak', 'Pegasus', 328, 1550],
    ['Ankara', 'Konya', 'Tren', 'YHT', 260, 310],
  ];
  const [from, to, transportType, company, distanceKm, cost] = routes[index % routes.length];
  const date = new Date(2026, index % 12, 3 + (index % 24)).toISOString().slice(0, 10);
  const isCar = transportType === 'Araç';
  return {
    title: `${from} → ${to} demo rotası`,
    from,
    to,
    transportType,
    company,
    date,
    departureTime: '09:00',
    arrivalTime: isCar ? '12:40' : '11:10',
    durationMinutes: isCar ? 220 : 130,
    distanceKm,
    ticketPrice: isCar ? 0 : cost,
    currency: 'TRY',
    fuelCost: isCar ? Math.round(cost * 0.68) : 0,
    roadCost: isCar ? Math.round(cost * 0.18) : 0,
    bridgeCost: isCar ? Math.round(cost * 0.08) : 0,
    parkingCost: isCar ? Math.round(cost * 0.04) : 0,
    otherCost: isCar ? Math.round(cost * 0.02) : 0,
    totalCost: cost,
    notes: 'Zengin demo veri kaydı.',
  };
});

export const getTrips = async (userId) => {
  if (!userId) return [];
  try {
    if (!hasFirebaseConfig) {
      const rows = sortTrips(localStore.list('trips', userId));
      console.info('Trips loaded count', rows.length);
      return rows;
    }
    const q = query(collection(db, 'trips'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const rows = sortTrips(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    console.info('Trips loaded count', rows.length);
    return rows;
  } catch (error) {
    console.error('Firestore error', error);
    throw error;
  }
};

export const createTrip = async (userId, data) => {
  if (!userId) throw new Error('Seyahat kaydı için kullanıcı zorunlu.');
  const payload = normalizeTripPayload(data, userId);
  if (!hasFirebaseConfig) return localStore.create('trips', payload);
  const ref = await addDoc(collection(db, 'trips'), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...payload, id: ref.id };
};

export const updateTrip = async (id, data) => {
  if (!id) throw new Error('Güncellenecek seyahat id değeri zorunlu.');
  const payload = normalizeTripPayload(data, data.userId);
  if (!hasFirebaseConfig) return localStore.update('trips', id, payload, data.userId);
  await updateDoc(doc(db, 'trips', id), { ...payload, updatedAt: serverTimestamp() });
  return { ...payload, id };
};

export const deleteTrip = async (id, userId) => {
  if (!id) return;
  if (!hasFirebaseConfig) return localStore.remove('trips', id, userId);
  await deleteDoc(doc(db, 'trips', id));
};

export const listTrips = getTrips;

export const saveTrip = async (trip, userId) => (trip.id ? updateTrip(trip.id, { ...trip, userId }) : createTrip(userId, trip));

export const createTripsBulk = async (userId, trips) => {
  if (!userId) throw new Error('Toplu import için kullanıcı zorunlu.');
  const created = [];
  for (const trip of trips) {
    created.push(await createTrip(userId, trip));
  }
  console.info('Bulk trips imported count', created.length);
  return created;
};

export const createDemoTrips = async (userId) => {
  if (!userId) throw new Error('Demo veri oluşturmak için kullanıcı zorunlu.');
  const created = [];
  for (const trip of [...demoSeedTrips, ...generatedDemoTrips]) {
    created.push(await createTrip(userId, trip));
  }
  console.info('Demo trips created count', created.length);
  return created;
};

export const listOwnedCollection = async (collectionName, userId) => {
  if (!collectionNames[collectionName] || !userId) return [];
  if (!hasFirebaseConfig) return localStore.list(collectionName, userId);
  const q = query(collection(db, collectionName), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const saveOwnedItem = async (collectionName, item, userId) => {
  if (!collectionNames[collectionName] || !userId) throw new Error('Geçersiz koleksiyon veya kullanıcı.');
  const payload = { ...item, userId };
  if (!hasFirebaseConfig) {
    return item.id ? localStore.update(collectionName, item.id, payload, userId) : localStore.create(collectionName, payload);
  }
  if (item.id) {
    await updateDoc(doc(db, collectionName, item.id), { ...payload, updatedAt: serverTimestamp() });
    return { ...payload, id: item.id };
  }
  const ref = await addDoc(collection(db, collectionName), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { ...payload, id: ref.id };
};

export const deleteOwnedItem = async (collectionName, id, userId) => {
  if (!collectionNames[collectionName] || !id || !userId) return;
  if (!hasFirebaseConfig) return localStore.remove(collectionName, id, userId);
  await deleteDoc(doc(db, collectionName, id));
};
