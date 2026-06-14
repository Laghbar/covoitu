export const MOROCCAN_CITIES = [
  'Agadir', 'Aït Melloul', 'Al Hoceïma', 'Azilal', 'Azrou',
  'Béni Mellal', 'Benslimane', 'Berrechid', 'Bouskoura',
  'Casablanca', 'Chefchaouen',
  'Dakhla',
  'El Jadida', 'El Kelâa des Sraghna', 'Errachidia', 'Essaouira',
  'Fès', 'Fkih Ben Salah',
  'Guelmim',
  'Ifrane', 'Inzegane',
  'Kénitra', 'Khemisset', 'Khouribga', 'Ksar el-Kébir',
  'Laâyoune', 'Larache',
  'Marrakech', 'Meknès', 'Midelt', 'Mohammedia',
  'Nador', 'Ouarzazate', 'Ouazzane', 'Oujda',
  'Rabat',
  'Safi', 'Salé', 'Settat', 'Sidi Bennour', 'Sidi Ifni', 'Sidi Slimane', 'Skhirate',
  'Tanger', 'Taroudant', 'Taza', 'Tétouan', 'Tiznit',
  'Zagora',
];

const ALIASES: Record<string, string> = {
  // Arabic names
  'الدار البيضاء': 'Casablanca', 'كازا': 'Casablanca', 'كازابلانكا': 'Casablanca',
  'الرباط': 'Rabat',
  'مراكش': 'Marrakech', 'مراكيش': 'Marrakech',
  'أكادير': 'Agadir', 'اكادير': 'Agadir',
  'فاس': 'Fès', 'فاس مكناس': 'Fès',
  'طنجة': 'Tanger', 'طنجا': 'Tanger',
  'تطوان': 'Tétouan',
  'مكناس': 'Meknès',
  'وجدة': 'Oujda',
  'العيون': 'Laâyoune',
  'الجديدة': 'El Jadida',
  'سطات': 'Settat',
  'بني ملال': 'Béni Mellal',
  'القنيطرة': 'Kénitra',
  'سلا': 'Salé',
  'الناظور': 'Nador',
  'خريبكة': 'Khouribga',
  'تازة': 'Taza',
  'الحسيمة': 'Al Hoceïma',
  'شفشاون': 'Chefchaouen',
  'زاكورة': 'Zagora',
  'ورزازات': 'Ouarzazate',
  'تيزنيت': 'Tiznit',
  'الراشيدية': 'Errachidia',
  'فقيه بن صالح': 'Fkih Ben Salah',
  'القصر الكبير': 'Ksar el-Kébir',
  'الصويرة': 'Essaouira',
  'أزيلال': 'Azilal', 'ازيلال': 'Azilal',
  'برشيد': 'Berrechid',
  'بنسليمان': 'Benslimane',
  'المحمدية': 'Mohammedia', 'محمدية': 'Mohammedia',
  'آسفي': 'Safi', 'صافي': 'Safi', 'أسفي': 'Safi',
  'الداخلة': 'Dakhla',
  'كلميم': 'Guelmim', 'كليميم': 'Guelmim',
  'خميسات': 'Khemisset',
  'سيدي سليمان': 'Sidi Slimane',
  'القلعة': 'El Kelâa des Sraghna',
  'ميدلت': 'Midelt',
  'لراش': 'Larache',
  'إفران': 'Ifrane', 'افران': 'Ifrane',
  'إنزكان': 'Inzegane', 'انزكان': 'Inzegane',
  'تارودانت': 'Taroudant',
  'ايت ملول': 'Aït Melloul', 'أيت ملول': 'Aït Melloul',
  'أزرو': 'Azrou', 'ازرو': 'Azrou',
  'بوسكورة': 'Bouskoura',
  'سكيرات': 'Skhirate',
  'سيدي بنور': 'Sidi Bennour',
  'سيدي إفني': 'Sidi Ifni',
  'واويزغت': 'Azilal',
  // French / Darija variants
  'casa': 'Casablanca', 'casa blanca': 'Casablanca',
  'fez': 'Fès', 'fez-meknes': 'Fès',
  'tangier': 'Tanger', 'tanja': 'Tanger',
  'tetouan': 'Tétouan',
  'meknes': 'Meknès',
  'kenitra': 'Kénitra',
  'sale': 'Salé',
  'beni mellal': 'Béni Mellal',
  'laayoune': 'Laâyoune', 'el aaiun': 'Laâyoune',
  'el jadida': 'El Jadida', 'eljadida': 'El Jadida',
  'tiznit': 'Tiznit',
  'essaouira': 'Essaouira',
  'ouarzazate': 'Ouarzazate',
};

// Strip diacritics for accent-insensitive comparison
// e.g. "Hoceïma" → "Hoceima", "Béni" → "Beni"
export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizeCity(input: string): string {
  if (!input?.trim()) return input;
  const t  = input.trim();
  const lc = t.toLowerCase();
  const ld = stripDiacritics(lc); // accent-free version for fuzzy matching

  // Direct alias lookup (case-insensitive, accent-insensitive)
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const al = alias.toLowerCase();
    if (al === lc || stripDiacritics(al) === ld) return canonical;
  }

  // Exact match against canonical list (case-insensitive, then accent-insensitive)
  const exact = MOROCCAN_CITIES.find(c => c.toLowerCase() === lc);
  if (exact) return exact;

  const exactAccent = MOROCCAN_CITIES.find(c => stripDiacritics(c.toLowerCase()) === ld);
  if (exactAccent) return exactAccent;

  // Partial match — accent-insensitive
  const partial = MOROCCAN_CITIES.find(c => {
    const cd = stripDiacritics(c.toLowerCase());
    return cd.includes(ld) || ld.includes(cd);
  });
  if (partial) return partial;

  return t;
}
