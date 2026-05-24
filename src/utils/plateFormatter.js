// Plakaları Türkiye formatına yaklaştırır: "34 ejc 537" -> "34 EJC 537".
export const formatPlate = (value = '') => {
  const normalized = value
    .toLocaleUpperCase('tr-TR')
    .replace(/[Ğ]/g, 'G')
    .replace(/[Ü]/g, 'U')
    .replace(/[Ş]/g, 'S')
    .replace(/[İI]/g, 'I')
    .replace(/[Ö]/g, 'O')
    .replace(/[Ç]/g, 'C')
    .replace(/[^0-9A-Z]/g, '');
  const match = normalized.match(/^(\d{1,2})([A-Z]{1,3})?(\d{0,4})?/);
  if (!match) return normalized;
  return [match[1], match[2], match[3]].filter(Boolean).join(' ');
};
