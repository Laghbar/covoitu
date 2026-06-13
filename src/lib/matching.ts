export type RequestData = {
  from_city: string;
  to_city: string;
  departure_date: string;  // YYYY-MM-DD
  departure_time: string;  // HH:MM
  seats_needed: number;
  max_price: number | null;
};

export type RideData = {
  from_city: string;
  to_city: string;
  departure_date: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
};

const ALIASES: Record<string, string> = {
  'casa':          'casablanca',
  'casa blanca':   'casablanca',
  'dar el beida':  'casablanca',
  'rabat':         'rabat',
  'sale':          'sale',
  'kenitra':       'kenitra',
  'fes':           'fes',
  'fez':           'fes',
  'fas':           'fes',
  'meknes':        'meknes',
  'meknas':        'meknes',
  'marrakesh':     'marrakech',
  'marrakesh':     'marrakech',
  'agadir':        'agadir',
  'tanger':        'tanger',
  'tangier':       'tanger',
  'tanja':         'tanger',
  'oujda':         'oujda',
  'tetouan':       'tetouan',
  'tetuan':        'tetouan',
  'nador':         'nador',
  'beni mellal':   'beni mellal',
  'benimellal':    'beni mellal',
  'khouribga':     'khouribga',
  'settat':        'settat',
  'el jadida':     'el jadida',
  'eljadida':      'el jadida',
  'safi':          'safi',
  'asfi':          'safi',
  'essaouira':     'essaouira',
  'mogador':       'essaouira',
  'dakhla':        'dakhla',
  'laayoune':      'laayoune',
  'tan tan':       'tan tan',
  'tantan':        'tan tan',
  'tiznit':        'tiznit',
  'taroudant':     'taroudant',
  'ouarzazate':    'ouarzazate',
  'errachidia':    'errachidia',
  'fkih ben salah': 'fkih ben salah',
  'fqih ben salah': 'fkih ben salah',
  'fkih':          'fkih ben salah',
  'fqih':          'fkih ben salah',
  'beni mellal':   'beni mellal',
  'khenifra':      'khenifra',
  'ifrane':        'ifrane',
  'azrou':         'azrou',
  'midelt':        'midelt',
  'taza':          'taza',
  'al hoceima':    'al hoceima',
  'alhucemas':     'al hoceima',
  'berkane':       'berkane',
  'taourirt':      'taourirt',
  'guelmim':       'guelmim',
};

function normalize(s: string): string {
  const base = s.toLowerCase().trim()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return ALIASES[base] ?? base;
}

function cityScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.6;
  return 0;
}

function daysDiff(d1: string, d2: string): number {
  return Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / 86_400_000;
}

function minutesDiff(t1: string, t2: string): number {
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  return Math.abs(h1 * 60 + m1 - (h2 * 60 + m2));
}

export function calcMatchScore(req: RequestData, ride: RideData): number {
  if (ride.available_seats < req.seats_needed) return 0;
  if (req.max_price != null && ride.price_per_seat > req.max_price) return 0;

  const originScore = Math.round(cityScore(req.from_city, ride.from_city) * 40);
  const destScore   = Math.round(cityScore(req.to_city,   ride.to_city)   * 30);

  const days = daysDiff(req.departure_date, ride.departure_date);
  const dateScore = days === 0 ? 20 : days <= 1 ? 10 : days <= 2 ? 4 : 0;

  const mins = minutesDiff(req.departure_time, ride.departure_time);
  const timeScore = mins <= 30 ? 10 : mins <= 60 ? 7 : mins <= 120 ? 4 : mins <= 240 ? 2 : 0;

  return Math.min(100, originScore + destScore + dateScore + timeScore);
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent match';
  if (score >= 70) return 'Good match';
  if (score >= 50) return 'Fair match';
  return 'Low match';
}

export function scoreColor(score: number): string {
  if (score >= 85) return '#10B981';
  if (score >= 70) return '#3B82F6';
  if (score >= 50) return '#D97706';
  return '#94A3B8';
}
