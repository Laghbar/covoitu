import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const C = '#10B981';

type Field = {
  key: string; label: string; placeholder: string;
  icon: { ios: string; android: string };
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
};

const FIELDS: Field[] = [
  { key: 'make',  label: 'Make',           placeholder: 'e.g. Dacia',         icon: { ios: 'car.fill', android: 'directions_car' } },
  { key: 'model', label: 'Model',          placeholder: 'e.g. Logan',         icon: { ios: 'car.side.fill', android: 'commute' } },
  { key: 'year',  label: 'Year',           placeholder: 'e.g. 2020',          icon: { ios: 'calendar', android: 'calendar_today' }, keyboardType: 'numeric' },
  { key: 'plate', label: 'Plate number',   placeholder: 'e.g. 12345 A 5',     icon: { ios: 'number.square.fill', android: 'confirmation_number' } },
  { key: 'color', label: 'Color',          placeholder: 'e.g. White',         icon: { ios: 'paintpalette.fill', android: 'palette' } },
  { key: 'seats', label: 'Total seats',    placeholder: 'e.g. 5',             icon: { ios: 'person.3.fill', android: 'groups' }, keyboardType: 'numeric' },
];

const DOCS = [
  { key: 'insurance', label: 'Insurance', icon: { ios: 'doc.fill', android: 'description' } },
  { key: 'technical', label: 'Technical Inspection', icon: { ios: 'checkmark.shield.fill', android: 'verified' } },
  { key: 'registration', label: 'Registration Card', icon: { ios: 'creditcard.fill', android: 'credit_card' } },
];

export function DriverVehicle() {
  const [values, setValues] = useState<Record<string, string>>({
    make: 'Dacia', model: 'Logan', year: '2021', plate: '12348 A 5', color: 'White', seats: '5',
  });
  const [docs, setDocs] = useState<Record<string, boolean>>({
    insurance: true, technical: true, registration: false,
  });
  const [editing, setEditing] = useState(false);

  const set = (k: string, v: string) => setValues((prev) => ({ ...prev, [k]: v }));

  const save = () => {
    Alert.alert('Vehicle Updated', 'Your vehicle information has been saved.');
    setEditing(false);
  };

  const addDoc = (key: string) => {
    Alert.alert('Upload Document', `Upload your ${DOCS.find(d => d.key === key)?.label}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upload', onPress: () => setDocs((d) => ({ ...d, [key]: true })) },
    ]);
  };

  const completedDocs = Object.values(docs).filter(Boolean).length;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      <Text style={styles.pageTitle}>My Vehicle</Text>

      {/* Verification summary */}
      <View style={[styles.verifyBanner, { backgroundColor: completedDocs === 3 ? C + '15' : '#FFF7ED' }]}>
        <View style={[styles.verifyIcon, { backgroundColor: completedDocs === 3 ? C : '#F97316' }]}>
          <SymbolView name={{ ios: completedDocs === 3 ? 'checkmark.shield.fill' : 'exclamationmark.triangle.fill', android: completedDocs === 3 ? 'verified' : 'warning' } as any} size={20} tintColor="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.verifyTitle, { color: completedDocs === 3 ? C : '#F97316' }]}>
            {completedDocs === 3 ? 'Vehicle Verified' : 'Verification Incomplete'}
          </Text>
          <Text style={styles.verifySub}>{completedDocs}/3 documents uploaded</Text>
        </View>
        <View style={styles.docsProgress}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.docDot, {
              backgroundColor: i < completedDocs ? (completedDocs === 3 ? C : '#F97316') : '#E2E8F0',
            }]} />
          ))}
        </View>
      </View>

      {/* Vehicle info card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Vehicle Information</Text>
          <Pressable
            style={[styles.editBtn, { backgroundColor: editing ? C : '#F1F5F9' }]}
            onPress={() => editing ? save() : setEditing(true)}>
            <SymbolView
              name={{ ios: editing ? 'checkmark' : 'pencil', android: editing ? 'check' : 'edit' } as any}
              size={13}
              tintColor={editing ? '#fff' : '#475569'}
            />
            <Text style={[styles.editBtnText, { color: editing ? '#fff' : '#475569' }]}>
              {editing ? 'Save' : 'Edit'}
            </Text>
          </Pressable>
        </View>

        {FIELDS.map((f) => (
          <View key={f.key}>
            <Text style={styles.fieldLabel}>{f.label}</Text>
            <View style={[styles.fieldBox, editing && { borderColor: C + '80', backgroundColor: '#F0FDF4' }]}>
              <SymbolView name={f.icon as any} size={15} tintColor={editing ? C : '#94A3B8'} />
              {editing ? (
                <TextInput
                  style={styles.fieldInput}
                  value={values[f.key] ?? ''}
                  onChangeText={(v) => set(f.key, v)}
                  placeholder={f.placeholder}
                  placeholderTextColor="#94A3B8"
                  keyboardType={f.keyboardType ?? 'default'}
                />
              ) : (
                <Text style={[styles.fieldValue, !values[f.key] && { color: '#94A3B8' }]}>
                  {values[f.key] || f.placeholder}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Photos placeholder */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle Photos</Text>
        <Text style={styles.cardSub}>Add photos to increase passenger trust.</Text>
        <View style={styles.photoGrid}>
          <Pressable style={styles.photoSlot} onPress={() => Alert.alert('Upload Photo', 'Camera roll will open.')}>
            <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera' } as any} size={24} tintColor={C} />
            <Text style={[styles.photoLabel, { color: C }]}>Front</Text>
          </Pressable>
          <Pressable style={styles.photoSlot} onPress={() => Alert.alert('Upload Photo', 'Camera roll will open.')}>
            <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera' } as any} size={24} tintColor="#94A3B8" />
            <Text style={styles.photoLabel}>Interior</Text>
          </Pressable>
          <Pressable style={styles.photoSlot} onPress={() => Alert.alert('Upload Photo', 'Camera roll will open.')}>
            <SymbolView name={{ ios: 'camera.fill', android: 'photo_camera' } as any} size={24} tintColor="#94A3B8" />
            <Text style={styles.photoLabel}>Side</Text>
          </Pressable>
        </View>
      </View>

      {/* Documents */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Documents</Text>
        <Text style={styles.cardSub}>Upload required documents to get verified.</Text>
        {DOCS.map((d) => (
          <View key={d.key} style={styles.docRow}>
            <View style={[styles.docIconBox, { backgroundColor: docs[d.key] ? C + '15' : '#F1F5F9' }]}>
              <SymbolView name={d.icon as any} size={16} tintColor={docs[d.key] ? C : '#94A3B8'} />
            </View>
            <Text style={styles.docLabel}>{d.label}</Text>
            {docs[d.key] ? (
              <View style={styles.docStatus}>
                <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle' } as any} size={18} tintColor={C} />
                <Text style={[styles.docStatusText, { color: C }]}>Uploaded</Text>
              </View>
            ) : (
              <Pressable style={styles.uploadBtn} onPress={() => addDoc(d.key)}>
                <Text style={[styles.uploadBtnText, { color: C }]}>Upload</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  verifyBanner: {
    borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  verifyIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  verifyTitle: { fontSize: 14, fontWeight: '700' },
  verifySub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  docsProgress: { flexDirection: 'row', gap: 5 },
  docDot: { width: 10, height: 10, borderRadius: 5 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: -6 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600' },

  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  fieldInput: { flex: 1, fontSize: 15, color: '#1E293B' },
  fieldValue: { flex: 1, fontSize: 15, color: '#1E293B', fontWeight: '500' },

  photoGrid: { flexDirection: 'row', gap: 10 },
  photoSlot: {
    flex: 1, height: 80, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  photoLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  docLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1E293B' },
  docStatus: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docStatusText: { fontSize: 13, fontWeight: '600' },
  uploadBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: C + '12' },
  uploadBtnText: { fontSize: 13, fontWeight: '700' },
});
