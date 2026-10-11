export const tollSources = {
  kgmMain: {
    name: 'KGM Otoyol ve Köprü Geçiş Ücretleri',
    url: 'https://www.kgm.gov.tr/Sayfalar/KGM/SiteTr/Otoyollar/UcretlerAna.aspx',
    validFrom: '2026-01-01',
  },
  kgmOsmangazi: {
    name: 'KGM Osmangazi Köprüsü Geçiş Ücretleri Tarifesi',
    url: 'https://www.kgm.gov.tr/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/2026Gecis_Ucret/2-Osmangazi.pdf',
    validFrom: '2026-07-01',
  },
  kgmCanakkale1915: {
    name: 'KGM 1915 Çanakkale Köprüsü Geçiş Ücretleri Tarifesi',
    url: 'https://www.kgm.gov.tr/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/2026Gecis_Ucret/4-1915Canakkale.pdf',
    validFrom: '2026-07-01',
  },
  kgmBosphorus: {
    name: 'KGM 15 Temmuz Şehitler ve Fatih Sultan Mehmet Köprüleri Tarifesi',
    url: 'https://www.kgm.gov.tr/SiteCollectionDocuments/KGMdocuments/Otoyollar/OtoyolKopruUcret/2026Gecis_Ucret/1-15Temmuz-FSM.pdf',
    validFrom: '2026-01-01',
  },
};

export const bridgeTollTariffs = [
  {
    id: 'osmangazi-bridge',
    roadId: 'O-5',
    name: 'Osmangazi Köprüsü',
    entry: 'Dilovası',
    exit: 'Hersek / Altınova',
    source: tollSources.kgmOsmangazi,
    pricesByClass: { 1: 1170, 2: 1870, 3: 2225, 4: 2950, 5: 3720, 6: 820 },
    match: {
      type: 'bridge',
      toleranceMeters: 1200,
      endpoints: [
        { lat: 40.7547, lng: 29.5156 },
        { lat: 40.6927, lng: 29.516 },
      ],
      keywords: ['osmangazi', 'o-5'],
    },
  },
  {
    id: 'canakkale-1915-bridge',
    roadId: 'O-6',
    name: '1915 Çanakkale Köprüsü',
    entry: 'Gelibolu / Sütlüce',
    exit: 'Lapseki / Şekerkaya',
    source: tollSources.kgmCanakkale1915,
    pricesByClass: { 1: 1170, 2: 1465, 3: 2635, 4: 2925, 5: 5560, 6: 295 },
    match: {
      type: 'bridge',
      toleranceMeters: 1500,
      endpoints: [
        { lat: 40.3459, lng: 26.6334 },
        { lat: 40.3177, lng: 26.6886 },
      ],
      keywords: ['1915', 'çanakkale', 'o-6'],
    },
  },
  {
    id: 'fsm-bridge',
    roadId: 'O-2',
    name: 'Fatih Sultan Mehmet Köprüsü',
    entry: 'Kavacık / Anadolu',
    exit: 'Hisarüstü / Avrupa',
    source: tollSources.kgmBosphorus,
    pricesByClass: { 1: 59, 2: 75, 3: 168, 4: 333, 5: 440, 6: 25 },
    match: {
      type: 'bridge',
      toleranceMeters: 850,
      endpoints: [
        { lat: 41.0915, lng: 29.061 },
        { lat: 41.091, lng: 29.038 },
      ],
      keywords: ['fatih sultan mehmet', 'fsm', 'o-2'],
    },
  },
  {
    id: 'july15-bridge',
    roadId: 'O-1',
    name: '15 Temmuz Şehitler Köprüsü',
    entry: 'Altunizade / Anadolu',
    exit: 'Ortaköy / Avrupa',
    source: tollSources.kgmBosphorus,
    pricesByClass: { 1: 59, 2: 75, 3: 168, 4: 333, 5: 440, 6: 25 },
    match: {
      type: 'bridge',
      toleranceMeters: 850,
      endpoints: [
        { lat: 41.0446, lng: 29.0345 },
        { lat: 41.0412, lng: 29.0075 },
      ],
      keywords: ['15 temmuz', 'boğaziçi', 'o-1'],
    },
  },
];
