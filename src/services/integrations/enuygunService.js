// Enuygun entegrasyonu için manuel kayıt akışını bozmayan mock adaptör.
export const enuygunService = {
  async fetchTickets() {
    return [
      {
        provider: 'Enuygun',
        title: 'Mock Enuygun uçuşu',
        transportType: 'Uçak',
        company: 'AJet',
        from: 'İstanbul',
        to: 'Antalya',
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  },
};
