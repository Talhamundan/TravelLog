// Obilet entegrasyonu için ileride gerçek API anahtarıyla değiştirilebilir mock servis.
export const obiletService = {
  async fetchTickets() {
    return [
      {
        provider: 'Obilet',
        title: 'Mock Obilet bileti',
        transportType: 'Otobüs',
        company: 'Metro',
        from: 'İstanbul',
        to: 'Ankara',
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  },
};
