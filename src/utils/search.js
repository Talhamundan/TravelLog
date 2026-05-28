export const normalizeSearchText = (value = '') =>
  String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9ğüşöçİ]/gi, '');

export const includesSearchTerm = (values = [], term = '') => {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm) return true;
  return values.some((value) => normalizeSearchText(value).includes(normalizedTerm));
};
