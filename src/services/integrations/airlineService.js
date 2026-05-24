// THY ve AJet gibi havayolu sağlayıcıları için ortak mock entegrasyon yüzeyi.
export const airlineService = {
  async fetchTickets(provider = 'THY') {
    return [
      {
        provider,
        title: `${provider} mock uçuş kaydı`,
        transportType: 'Uçak',
        company: provider,
        from: 'İstanbul',
        to: 'İzmir',
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  },
};
