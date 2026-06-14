import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/context/auth';
import { useLang } from '@/context/language';
import { supabase } from '@/lib/supabase';
import { MOROCCAN_CITIES, normalizeCity } from '@/lib/cities';
import { calcDriverCommission, calcPassengerPrice, calcDriverNet, PASSENGER_FEE_INAPP } from '@/lib/commission';
import { DocumentsModal } from './documents';

const C = '#10B981';

const PREF_ICONS = [
  { key: 'luggage', icon: { ios: 'bag.fill',         android: 'luggage'     } },
  { key: 'pets',    icon: { ios: 'pawprint.fill',    android: 'pets'        } },
  { key: 'nosmoke', icon: { ios: 'nosign',           android: 'smoke_free'  } },
  { key: 'music',   icon: { ios: 'music.note',       android: 'music_note'  } },
  { key: 'ac',      icon: { ios: 'snowflake',        android: 'ac_unit'     } },
  { key: 'chat',    icon: { ios: 'bubble.left.fill', android: 'chat'        } },
];

function CityPicker({ label, value, onSelect, icon }: {
  label: string; value: string; onSelect: (c: string) => void;
  icon: { ios: string; android: string };
}) {
  const [text,    setText]    = useState(value);
  const [focused, setFocused] = useState(false);
  const selecting = useRef(false);

  // Keep display in sync when parent sets value externally (e.g. GPS detect)
  const prevValue = useRef(value);
  if (value !== prevValue.current) {
    prevValue.current = value;
    if (value !== text) setText(value);
  }

  const suggestions = text.length >= 1
    ? MOROCCAN_CITIES.filter(c => c.toLowerCase().includes(text.toLowerCase())).slice(0, 8)
    : MOROCCAN_CITIES.slice(0, 8);
  const showDropdown = focused && suggestions.length > 0;

  const commit = (city: string) => {
    setText(city);
    onSelect(normalizeCity(city));
    setFocused(false);
  };

  return (
    <View style={{ zIndex: showDropdown ? 200 : 1 }}>
      <View style={styles.cityBtn}>
        <SymbolView name={icon as any} size={16} tintColor={text ? C : '#94A3B8'} />
        <TextInput
          style={[styles.cityBtnText, { flex: 1, padding: 0, color: text ? '#1E293B' : '#94A3B8' }]}
          value={text}
          onChangeText={(t) => { setText(t); onSelect(t); }}
          placeholder={label}
          placeholderTextColor="#94A3B8"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            if (selecting.current) { selecting.current = false; return; }
            setTimeout(() => setFocused(false), 150);
          }}
        />
        {text.length > 0 && (
          <Pressable onPress={() => { setText(''); onSelect(''); }}>
            <Text style={{ color: '#CBD5E1', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View
          style={styles.cityDropdown}
          {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
        >
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {suggestions.map((c) => (
              <Pressable
                key={c}
                style={[styles.cityOption, value === c && { backgroundColor: C + '10' }]}
                onPressIn={() => { selecting.current = true; }}
                onPress={() => commit(c)}
              >
                <Text style={[styles.cityOptionText, value === c && { color: C, fontWeight: '700' }]}>{c}</Text>
                {value === c && <SymbolView name={{ ios: 'checkmark', android: 'check' } as any} size={14} tintColor={C} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function StepHeader({ num, title }: { num: number; title: string }) {
  return (
    <View style={styles.stepHeader}>
      <View style={[styles.stepNum, { backgroundColor: C }]}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function PickerField({
  icon, emoji, label, value, onPress,
}: { icon: any; emoji: string; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable style={styles.pickerBtn} onPress={onPress}>
      <SymbolView name={icon} size={16} tintColor={value ? C : '#94A3B8'} />
      <Text style={[styles.pickerText, value ? styles.pickerTextFilled : null]}>
        {emoji} {value || label}
      </Text>
      <Text style={styles.chevron}>▾</Text>
    </Pressable>
  );
}

function WebField({ emoji, label, type, value, min, onChange }: {
  emoji: string; label: string; type: 'date' | 'time';
  value: string; min?: string; onChange: (v: string) => void;
}) {
  return (
    <View style={styles.pickerBtn}>
      <Text style={styles.pickerEmoji}>{emoji}</Text>
      {/* @ts-ignore – web-only HTML element */}
      <input
        type={type}
        value={value || ''}
        min={min}
        onChange={(e: any) => onChange(e.target.value)}
        style={{
          flex: 1, border: 'none', background: 'transparent',
          fontSize: 14, color: value ? '#1E293B' : '#94A3B8',
          outline: 'none', cursor: 'pointer', minWidth: 0,
        }}
      />
    </View>
  );
}

type Props = { onNavigate: (key: string) => void; onWalletUpdated?: () => void };

export function DriverCreateTrip({ onNavigate, onWalletUpdated }: Props) {
  const { user, refreshUser } = useAuth();
  const t = useLang();
  const isVerified = user?.verification_status === 'verified';

  const PREFS = [
    { key: 'luggage',  label: t('Luggage',  'Bagages'),     icon: PREF_ICONS[0].icon },
    { key: 'pets',     label: t('Pets OK',  'Animaux OK'),  icon: PREF_ICONS[1].icon },
    { key: 'nosmoke',  label: t('No Smoke', 'Non-fumeur'),  icon: PREF_ICONS[2].icon },
    { key: 'music',    label: t('Music',    'Musique'),     icon: PREF_ICONS[3].icon },
    { key: 'ac',       label: t('A/C',      'Climatisation'), icon: PREF_ICONS[4].icon },
    { key: 'chat',     label: t('Chatty',   'Bavard'),      icon: PREF_ICONS[5].icon },
  ];
  const [docsOpen, setDocsOpen] = useState(false);
  const [from, setFrom]       = useState('');
  const [to, setTo]           = useState('');
  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [timeObj, setTimeObj] = useState<Date>(new Date());
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [seats, setSeats]     = useState('3');
  const [price, setPrice]     = useState('');
  const [pickup, setPickup]   = useState('');
  const [dropoff, setDropoff] = useState('');
  const [note, setNote]       = useState('');
  const [carMake,  setCarMake]  = useState('');
  const [carModel, setCarModel] = useState('');
  const [carYear,  setCarYear]  = useState('');
  const [carColor, setCarColor] = useState('');
  const [carPlate, setCarPlate] = useState('');
  const [prefs, setPrefs]         = useState(['luggage', 'nosmoke']);
  const [payment, setPayment]     = useState<'cash' | 'in_app'>('cash');
  const [loading, setLoading]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const fetchWalletBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('driver_wallets')
      .select('balance')
      .eq('driver_id', user.id)
      .single();
    setWalletBalance(data?.balance ?? 0);
  }, [user]);

  useEffect(() => { fetchWalletBalance(); }, [fetchWalletBalance]);

  const priceNum    = Number(price) || 0;
  const commission  = priceNum ? calcDriverCommission(priceNum) : 0;
  const passengerPays = priceNum ? calcPassengerPrice(priceNum, payment) : 0;
  const driverNets    = priceNum ? calcDriverNet(priceNum, payment) : 0;

  const applyCity = (raw: string) => {
    setFrom(normalizeCity(raw));
  };

  const detectDeparture = () => {
    setLocLoading(true);
    setSubmitError(null);

    if (Platform.OS === 'web') {
      if (!('geolocation' in navigator)) {
        setSubmitError(t('Geolocation not supported by this browser.', 'Géolocalisation non supportée par ce navigateur.'));
        setLocLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const res  = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
              { headers: { 'Accept-Language': 'en' } },
            );
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county;
            if (city) applyCity(city);
            else setSubmitError(t('City not detected. Please select manually.', 'Ville non détectée. Veuillez sélectionner manuellement.'));
          } catch {
            setSubmitError(t('Could not fetch city. Please select manually.', 'Impossible de récupérer la ville. Veuillez sélectionner manuellement.'));
          }
          setLocLoading(false);
        },
        () => {
          setSubmitError(t('Location denied. Allow location access in your browser and try again.', 'Localisation refusée. Autorisez l\'accès à la localisation dans votre navigateur et réessayez.'));
          setLocLoading(false);
        },
        { timeout: 10000 },
      );
      return;
    }

    // Native (iOS / Android)
    Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
      if (status !== 'granted') {
        setSubmitError(t('Location permission denied.', 'Permission de localisation refusée.'));
        setLocLoading(false);
        return;
      }
      try {
        const pos   = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        const raw   = geo?.city || geo?.subregion || geo?.region || '';
        if (raw) applyCity(raw);
        else setSubmitError(t('Could not detect city. Select manually.', 'Ville non détectée. Sélectionnez manuellement.'));
      } catch {
        setSubmitError(t('Location unavailable. Select manually.', 'Localisation indisponible. Sélectionnez manuellement.'));
      }
      setLocLoading(false);
    });
  };
  const [datePicked, setDatePicked] = useState(false);
  const [timePicked, setTimePicked] = useState(false);

  const dateStr = datePicked
    ? dateObj.toLocaleDateString(t('en-GB', 'fr-MA') as any, { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const timeStr = timePicked
    ? timeObj.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const dateISO = datePicked ? dateObj.toISOString().split('T')[0] : '';
  const timeISO = timePicked
    ? `${String(timeObj.getHours()).padStart(2,'0')}:${String(timeObj.getMinutes()).padStart(2,'0')}`
    : '';

  const toggle = (k: string) =>
    setPrefs((p) => p.includes(k) ? p.filter((x) => x !== k) : [...p, k]);

  const changeSeats = (d: number) =>
    setSeats((s) => String(Math.min(8, Math.max(1, Number(s) + d))));

  const doPublish = async () => {
    if (!user) { setSubmitError(t('Not logged in.', 'Non connecté.')); return; }
    setLoading(true);
    setSubmitError(null);
    const { error } = await supabase.from('rides').insert({
      driver_id:       user.id,
      from_city:       normalizeCity(from),
      to_city:         normalizeCity(to),
      departure_date:  dateISO,
      departure_time:  timeISO,
      seats:           Number(seats),
      price:           Number(price),
      pickup_point:    pickup || null,
      dropoff_point:   dropoff || null,
      preferences:     prefs,
      note:            note || null,
      payment_method:  payment,
      status:          'active',
      car_make:        carMake  || null,
      car_model:       carModel || null,
      car_year:        carYear  || null,
      car_color:       carColor || null,
      car_plate:       carPlate || null,
    });
    setLoading(false);

    if (error) {
      // Parse friendly messages from trigger exceptions
      const msg = error.message ?? '';
      if (msg.includes('insufficient_balance')) {
        const needed = msg.match(/([\d.]+) MAD/)?.[1] ?? commission;
        setSubmitError(t(
          `Insufficient wallet balance. You need ${needed} MAD commission reserved. Please recharge your wallet.`,
          `Solde insuffisant. Vous avez besoin de ${needed} MAD de commission. Veuillez recharger votre portefeuille.`,
        ));
      } else if (msg.includes('wallet_not_found')) {
        setSubmitError(t(
          'Wallet not found. Please visit the Wallet tab to set up your account.',
          "Portefeuille introuvable. Veuillez accéder à l'onglet Portefeuille pour configurer votre compte.",
        ));
      } else {
        setSubmitError(msg);
      }
      return;
    }

    onWalletUpdated?.();
    onNavigate('rides');
  };

  const submit = () => {
    setSubmitError(null);
    if (!from || !to || !datePicked || !timePicked || !price) {
      setSubmitError(t('Please fill in route, date, time and price.', 'Veuillez remplir l\'itinéraire, la date, l\'heure et le prix.'));
      return;
    }
    if (!user) { setSubmitError(t('Not logged in.', 'Non connecté.')); return; }

    // Wallet balance check (client-side pre-check for fast UX; DB trigger is the real guard)
    if (walletBalance !== null && walletBalance < commission) {
      setSubmitError(t(
        `Insufficient wallet balance. You need ${commission} MAD for the platform commission but your wallet has ${walletBalance.toFixed(0)} MAD. Please recharge your wallet.`,
        `Solde insuffisant. Vous avez besoin de ${commission} MAD de commission mais votre portefeuille n'a que ${walletBalance.toFixed(0)} MAD. Veuillez recharger votre portefeuille.`,
      ));
      return;
    }

    const confirmMsg = t(
      `Publishing this trip will reserve ${commission} MAD from your wallet as platform commission.\n\nAvailable: ${(walletBalance ?? 0).toFixed(0)} MAD\nCommission: ${commission} MAD\nRemaining: ${((walletBalance ?? 0) - commission).toFixed(0)} MAD`,
      `La publication réservera ${commission} MAD depuis votre portefeuille.\n\nSolde : ${(walletBalance ?? 0).toFixed(0)} MAD\nCommission : ${commission} MAD\nReste : ${((walletBalance ?? 0) - commission).toFixed(0)} MAD`,
    );

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) doPublish();
    } else {
      Alert.alert(
        t('Confirm & Reserve Commission', 'Confirmer & réserver la commission'),
        confirmMsg,
        [
          { text: t('Cancel', 'Annuler'), style: 'cancel' },
          { text: t('Publish Trip', 'Publier le trajet'), onPress: doPublish },
        ],
      );
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>{t('Create a Trip', 'Créer un trajet')}</Text>
      <Text style={styles.pageSub}>{t('Fill in the details so passengers can find and book your ride.', 'Remplissez les détails pour que les passagers puissent vous trouver.')}</Text>

      {/* Step 1 – Route */}
      <View style={styles.card}>
        <StepHeader num={1} title={t('Route', 'Itinéraire')} />

        <CityPicker
          label={t('Departure city *', 'Ville de départ *')}
          value={from}
          onSelect={setFrom}
          icon={{ ios: 'location.fill', android: 'location_on' }}
        />

        <Pressable style={styles.locBtn} onPress={detectDeparture} disabled={locLoading}>
          <Text style={styles.locBtnText}>{locLoading ? t('Detecting…', 'Détection…') : `📍  ${t('Use my current location', 'Utiliser ma position actuelle')}`}</Text>
        </Pressable>

        {/* Swap */}
        <View style={styles.swapRow}>
          <View style={styles.swapLine} />
          <Pressable
            style={[styles.swapBtn, { borderColor: C + '50' }]}
            onPress={() => { const tmp = from; setFrom(to); setTo(tmp); }}>
            <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert' } as any} size={14} tintColor={C} />
          </Pressable>
          <View style={styles.swapLine} />
        </View>

        <CityPicker
          label={t('Destination city *', 'Ville de destination *')}
          value={to}
          onSelect={setTo}
          icon={{ ios: 'mappin', android: 'place' }}
        />
      </View>

      {/* Step 2 – Date & Time */}
      <View style={styles.card}>
        <StepHeader num={2} title={t('Date & Time', 'Date & Heure')} />
        <View style={styles.row}>
          <View style={{ flex: 3 }}>
            {Platform.OS === 'web' ? (
              <WebField
                emoji="📅" label="Date *" type="date" value={dateISO}
                min={new Date().toISOString().split('T')[0]}
                onChange={(v) => {
                  if (v) { setDateObj(new Date(v + 'T12:00:00')); setDatePicked(true); }
                }}
              />
            ) : (
              <PickerField
                icon={{ ios: 'calendar', android: 'calendar_today' } as any}
                emoji="📅" label={t('Pick a date *', 'Choisir une date *')} value={dateStr}
                onPress={() => setShowDate(true)}
              />
            )}
          </View>
          <View style={{ flex: 2 }}>
            {Platform.OS === 'web' ? (
              <WebField
                emoji="⏰" label="Time *" type="time" value={timeISO}
                onChange={(v) => {
                  if (v) {
                    const [h, m] = v.split(':').map(Number);
                    const t = new Date(); t.setHours(h, m, 0, 0);
                    setTimeObj(t); setTimePicked(true);
                  }
                }}
              />
            ) : (
              <PickerField
                icon={{ ios: 'clock.fill', android: 'schedule' } as any}
                emoji="⏰" label={t('Pick time *', "Choisir l'heure *")} value={timeStr}
                onPress={() => setShowTime(true)}
              />
            )}
          </View>
        </View>

        {/* Native date picker (iOS / Android only) */}
        {Platform.OS !== 'web' && showDate && (
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date()}
            onChange={(_e, d) => {
              if (Platform.OS !== 'ios') setShowDate(false);
              if (d) { setDateObj(d); setDatePicked(true); }
            }}
            themeVariant="light"
          />
        )}
        {Platform.OS === 'ios' && showDate && (
          <Pressable style={[styles.doneBtn, { backgroundColor: C }]} onPress={() => setShowDate(false)}>
            <Text style={styles.doneBtnText}>{t('Done', 'Terminé')}</Text>
          </Pressable>
        )}

        {/* Native time picker (iOS / Android only) */}
        {Platform.OS !== 'web' && showTime && (
          <DateTimePicker
            value={timeObj}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            onChange={(_e, tm) => {
              if (Platform.OS !== 'ios') setShowTime(false);
              if (tm) { setTimeObj(tm); setTimePicked(true); }
            }}
            themeVariant="light"
          />
        )}
        {Platform.OS === 'ios' && showTime && (
          <Pressable style={[styles.doneBtn, { backgroundColor: C }]} onPress={() => setShowTime(false)}>
            <Text style={styles.doneBtnText}>{t('Done', 'Terminé')}</Text>
          </Pressable>
        )}
      </View>

      {/* Step 3 – Seats & Price */}
      <View style={styles.card}>
        <StepHeader num={3} title={t('Seats & Price', 'Places & Prix')} />
        <View style={styles.row}>
          {/* Seats stepper */}
          <View style={[styles.stepper, { flex: 1 }]}>
            <Text style={styles.stepperLabel}>{t('Available seats', 'Places disponibles')}</Text>
            <View style={styles.stepperRow}>
              <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => changeSeats(-1)}>
                <Text style={[styles.stepperBtnText, { color: C }]}>−</Text>
              </Pressable>
              <Text style={styles.stepperVal}>{seats}</Text>
              <Pressable style={[styles.stepperBtn, { borderColor: C }]} onPress={() => changeSeats(1)}>
                <Text style={[styles.stepperBtnText, { color: C }]}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Price */}
          <View style={[styles.inputBox, { flex: 1 }]}>
            <Text style={styles.currency}>MAD</Text>
            <TextInput
              style={styles.inputText}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder={t('Price *', 'Prix *')}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>
        {priceNum > 0 ? (
          <View style={[styles.estimateBanner, { backgroundColor: C + '10' }]}>
            <SymbolView name={{ ios: 'info.circle.fill', android: 'info' } as any} size={14} tintColor={C} />
            <Text style={[styles.estimateText, { color: C }]}>
              {t(`Net revenue if full: ${driverNets * Number(seats)} MAD`, `Revenu net si complet : ${driverNets * Number(seats)} MAD`)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Step 4 – Payment method */}
      <View style={styles.card}>
        <StepHeader num={4} title={t('Payment method', 'Mode de paiement')} />
        <Text style={styles.payHint}>{t('How will the passenger pay you?', 'Comment le passager vous paiera-t-il ?')}</Text>
        <View style={styles.payRow}>
          <Pressable
            style={[styles.payOption, payment === 'cash' && { borderColor: C, backgroundColor: C + '10' }]}
            onPress={() => setPayment('cash')}>
            <Text style={styles.payEmoji}>💵</Text>
            <Text style={[styles.payLabel, payment === 'cash' && { color: C }]}>{t('Cash', 'Espèces')}</Text>
            <Text style={styles.payDesc}>{t('Passenger pays you directly in cash', 'Le passager vous paye directement en main')}</Text>
            {payment === 'cash' && <View style={[styles.payCheck, { backgroundColor: C }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
          </Pressable>
          <Pressable
            style={[styles.payOption, payment === 'in_app' && { borderColor: C, backgroundColor: C + '10' }]}
            onPress={() => setPayment('in_app')}>
            <Text style={styles.payEmoji}>📱</Text>
            <Text style={[styles.payLabel, payment === 'in_app' && { color: C }]}>{t('Via the app', "Via l'application")}</Text>
            <Text style={styles.payDesc}>{t('Secure payment via Horizon wallet', 'Paiement sécurisé via le portefeuille Horizon')}</Text>
            {payment === 'in_app' && <View style={[styles.payCheck, { backgroundColor: C }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
          </Pressable>
        </View>
      </View>

      {/* Step 5 – Meeting points */}
      <View style={styles.card}>
        <StepHeader num={5} title={t('Meeting Points', 'Points de rencontre')} />
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'arrow.up.circle.fill', android: 'trip_origin' } as any} size={16} tintColor={C} />
          <TextInput style={styles.inputText} value={pickup} onChangeText={setPickup} placeholder={t('Pickup point (street, landmark…)', 'Point de prise en charge (rue, repère…)')} placeholderTextColor="#94A3B8" />
        </View>
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'arrow.down.circle.fill', android: 'place' } as any} size={16} tintColor="#EF4444" />
          <TextInput style={styles.inputText} value={dropoff} onChangeText={setDropoff} placeholder={t('Drop-off point (street, landmark…)', 'Point de dépose (rue, repère…)')} placeholderTextColor="#94A3B8" />
        </View>
      </View>

      {/* Step 6 – Vehicle */}
      <View style={styles.card}>
        <StepHeader num={6} title={t('Your Vehicle', 'Votre véhicule')} />
        <View style={styles.row}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'car.fill', android: 'directions_car' } as any} size={15} tintColor={carMake ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carMake} onChangeText={setCarMake} placeholder={t('Make (e.g. Dacia)', 'Marque (ex. Dacia)')} placeholderTextColor="#94A3B8" />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'car.side.fill', android: 'commute' } as any} size={15} tintColor={carModel ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carModel} onChangeText={setCarModel} placeholder={t('Model (e.g. Logan)', 'Modèle (ex. Logan)')} placeholderTextColor="#94A3B8" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'calendar', android: 'calendar_today' } as any} size={15} tintColor={carYear ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carYear} onChangeText={setCarYear} placeholder={t('Year', 'Année')} placeholderTextColor="#94A3B8" keyboardType="numeric" maxLength={4} />
          </View>
          <View style={[styles.inputBox, { flex: 1 }]}>
            <SymbolView name={{ ios: 'paintpalette.fill', android: 'palette' } as any} size={15} tintColor={carColor ? C : '#94A3B8'} />
            <TextInput style={styles.inputText} value={carColor} onChangeText={setCarColor} placeholder={t('Color', 'Couleur')} placeholderTextColor="#94A3B8" />
          </View>
        </View>
        <View style={styles.inputBox}>
          <SymbolView name={{ ios: 'number.square.fill', android: 'confirmation_number' } as any} size={15} tintColor={carPlate ? C : '#94A3B8'} />
          <TextInput style={styles.inputText} value={carPlate} onChangeText={setCarPlate} placeholder={t('Plate number (e.g. 12345 A 5)', 'Numéro de plaque (ex. 12345 A 5)')} placeholderTextColor="#94A3B8" autoCapitalize="characters" />
        </View>
      </View>

      {/* Step 7 – Preferences */}
      <View style={styles.card}>
        <StepHeader num={7} title={t('Preferences', 'Préférences')} />
        <View style={styles.prefGrid}>
          {PREFS.map((p) => {
            const on = prefs.includes(p.key);
            return (
              <Pressable
                key={p.key}
                style={[styles.prefChip, on && { backgroundColor: C + '12', borderColor: C }]}
                onPress={() => toggle(p.key)}>
                <SymbolView name={p.icon as any} size={14} tintColor={on ? C : '#94A3B8'} />
                <Text style={[styles.prefLabel, on && { color: C }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Step 8 – Note */}
      <View style={styles.card}>
        <StepHeader num={8} title={t('Note for passengers (optional)', 'Note pour les passagers (optionnel)')} />
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={t("e.g. Meeting at the main entrance. I drive calmly and I'm punctual.", "Ex. Rendez-vous à l'entrée principale. Je conduis calmement et suis ponctuel.")}
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Commission / pricing preview */}
      {priceNum > 0 && (
        <View style={[styles.commissionBox, walletBalance !== null && walletBalance < commission && styles.commissionBoxWarn]}>

          {payment === 'cash' ? (
            <>
              {/* CASH breakdown */}
              <Text style={[styles.commissionLabel, { fontWeight: '800', marginBottom: 4, color: '#1E293B' }]}>
                {t('💵 Summary — Cash payment', '💵 Résumé — Paiement en espèces')}
              </Text>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{t('Base price (your revenue)', 'Prix de base (votre revenu)')}</Text>
                <Text style={styles.commissionValue}>{priceNum} MAD</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{t('Platform commission (10%)', 'Commission plateforme (10%)')}</Text>
                <Text style={[styles.commissionValue, { color: '#EF4444' }]}>+ {commission} MAD</Text>
              </View>
              <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.commissionLabel, { fontWeight: '800', color: '#1E293B' }]}>{t('Passenger pays', 'Le passager paie')}</Text>
                <Text style={[styles.commissionValue, { fontSize: 16, color: C }]}>{passengerPays} MAD</Text>
              </View>
              <Text style={[styles.commissionNote, { marginTop: 4 }]}>
                {t(
                  `Passenger pays you ${passengerPays} MAD in cash. You transfer ${commission} MAD to the platform from your wallet.`,
                  `Le passager vous paie ${passengerPays} MAD en espèces. Vous reversez ${commission} MAD à la plateforme depuis votre portefeuille.`,
                )}
              </Text>
            </>
          ) : (
            <>
              {/* IN-APP breakdown */}
              <Text style={[styles.commissionLabel, { fontWeight: '800', marginBottom: 4, color: '#1E293B' }]}>
                {t("📱 Summary — Payment via the app", "📱 Résumé — Paiement via l'application")}
              </Text>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{t('Base price', 'Prix de base')}</Text>
                <Text style={styles.commissionValue}>{priceNum} MAD</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{t('Passenger fee (platform)', 'Frais passager (plateforme)')}</Text>
                <Text style={[styles.commissionValue, { color: '#3B82F6' }]}>+ {PASSENGER_FEE_INAPP} MAD</Text>
              </View>
              <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.commissionLabel, { fontWeight: '800', color: '#1E293B' }]}>{t('Passenger pays', 'Le passager paie')}</Text>
                <Text style={[styles.commissionValue, { fontSize: 16, color: '#3B82F6' }]}>{passengerPays} MAD</Text>
              </View>
              <View style={styles.commissionRow}>
                <Text style={styles.commissionLabel}>{t('Your commission (10%)', 'Votre commission (10%)')}</Text>
                <Text style={[styles.commissionValue, { color: '#EF4444' }]}>− {commission} MAD</Text>
              </View>
              <View style={[styles.commissionRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.commissionLabel, { fontWeight: '800', color: '#1E293B' }]}>{t('Your net revenue', 'Votre revenu net')}</Text>
                <Text style={[styles.commissionValue, { fontSize: 16, color: C }]}>{driverNets} {t('MAD / seat', 'MAD / siège')}</Text>
              </View>
            </>
          )}

          {/* Wallet check */}
          {walletBalance !== null && (
            <View style={[styles.commissionRow, { marginTop: 6 }]}>
              <Text style={styles.commissionLabel}>{t('Wallet balance', 'Solde portefeuille')}</Text>
              <Text style={[styles.commissionValue, walletBalance < commission && { color: '#EF4444' }]}>
                {walletBalance.toFixed(0)} MAD
              </Text>
            </View>
          )}
          {walletBalance !== null && walletBalance < commission && (
            <Pressable style={styles.rechargeLink} onPress={() => onNavigate('wallet')}>
              <Text style={styles.rechargeLinkTxt}>{t('⚡ Recharge wallet →', '⚡ Recharger le portefeuille →')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Inline error */}
      {submitError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{submitError}</Text>
          {submitError.includes('wallet') || submitError.includes('portefeuille') ? (
            <Pressable onPress={() => onNavigate('wallet')} style={styles.rechargeBtn}>
              <Text style={styles.rechargeBtnTxt}>{t('Go to Wallet →', 'Aller au portefeuille →')}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Verification gate — shown instead of Publish when driver is not verified */}
      {!isVerified ? (
        <View style={styles.verifGate}>
          <Text style={styles.verifGateTitle}>
            {user?.verification_status === 'pending_review'
              ? t('⏳ Verification Pending', '⏳ Vérification en attente')
              : t('📋 Verification Required', '📋 Vérification requise')}
          </Text>
          <Text style={styles.verifGateBody}>
            {user?.verification_status === 'pending_review'
              ? t('Your documents are under review. You can publish rides once an admin approves your account.', "Vos documents sont en cours de vérification. Vous pourrez publier des trajets une fois qu'un administrateur approuve votre compte.")
              : t('You must upload your documents and get verified before you can publish a ride.', 'Vous devez télécharger vos documents et être vérifié avant de pouvoir publier un trajet.')}
          </Text>
          {user?.verification_status !== 'pending_review' && (
            <Pressable style={styles.verifGateBtn} onPress={() => setDocsOpen(true)}>
              <Text style={styles.verifGateBtnTxt}>{t('Upload Documents →', 'Télécharger les documents →')}</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          style={[styles.publishBtn, { backgroundColor: loading ? C + '80' : C }]}
          onPress={submit}
          disabled={loading || (walletBalance !== null && commission > 0 && walletBalance < commission)}
        >
          <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={20} tintColor="#fff" />
          <Text style={styles.publishText}>{loading ? t('Publishing…', 'Publication…') : t('Publish Trip', 'Publier le trajet')}</Text>
        </Pressable>
      )}

      <DocumentsModal
        visible={docsOpen}
        onClose={async () => { setDocsOpen(false); await refreshUser(); }}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },
  pageSub: { fontSize: 14, color: '#64748B', marginTop: -8 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },

  cityBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  cityBtnText: { flex: 1, fontSize: 15, color: '#94A3B8' },
  cityDropdown: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0',
    overflow: 'hidden', marginTop: -4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  cityOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  cityOptionText: { fontSize: 15, color: '#1E293B' },

  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swapLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  swapBtn: { padding: 8, borderRadius: 20, borderWidth: 1, backgroundColor: '#F8FAFC' },

  row: { flexDirection: 'row', gap: 10 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  inputText: { flex: 1, fontSize: 14, color: '#1E293B' },
  currency: { fontSize: 13, fontWeight: '700', color: '#64748B' },

  stepper: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, gap: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  stepperLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 18, fontWeight: '700', lineHeight: 20 },
  stepperVal: { fontSize: 20, fontWeight: '800', color: '#1E293B', minWidth: 24, textAlign: 'center' },

  estimateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  estimateText: { fontSize: 13, fontWeight: '500', flex: 1 },

  payHint: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  payRow: { flexDirection: 'row', gap: 10 },
  payOption: {
    flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    padding: 14, gap: 6, alignItems: 'center', position: 'relative',
  },
  payEmoji: { fontSize: 28 },
  payLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B', textAlign: 'center' },
  payDesc:  { fontSize: 11, color: '#94A3B8', textAlign: 'center', lineHeight: 15 },
  payCheck: {
    position: 'absolute', top: 8, right: 8,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },

  prefGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  prefChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  prefLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },

  noteInput: {
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0', fontSize: 14, color: '#1E293B',
    minHeight: 80, textAlignVertical: 'top',
  },

  publishBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, paddingVertical: 16,
  },
  publishText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  pickerText: { flex: 1, fontSize: 14, color: '#94A3B8' },
  pickerTextFilled: { color: '#1E293B', fontWeight: '600' },
  pickerEmoji: { fontSize: 16 },
  chevron: { fontSize: 13, color: '#94A3B8' },

  doneBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECACA', gap: 10 },
  errorText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },

  commissionBox: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, gap: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  commissionBoxWarn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  commissionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commissionLabel:{ fontSize: 13, color: '#64748B', fontWeight: '500' },
  commissionValue:{ fontSize: 14, fontWeight: '800', color: '#1E293B' },
  commissionNote: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  rechargeLink:   { alignSelf: 'flex-start' },
  rechargeLinkTxt:{ fontSize: 13, color: '#EF4444', fontWeight: '700' },
  rechargeBtn:    { backgroundColor: '#EF4444', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  rechargeBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },

  verifGate: {
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: 20, gap: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  verifGateTitle: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  verifGateBody:  { fontSize: 13, color: '#78350F', lineHeight: 19 },
  verifGateBtn:   { backgroundColor: '#F59E0B', borderRadius: 12, paddingVertical: 11, alignItems: 'center', marginTop: 4 },
  verifGateBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '700' },

  locBtn: { alignSelf: 'flex-start' },
  locBtnText: { fontSize: 13, color: C, fontWeight: '600' },
});
