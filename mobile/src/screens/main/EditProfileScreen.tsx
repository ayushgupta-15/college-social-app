import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { updateMe } from '../../services/usersService';
import { ProfileStackParamList } from '../../navigation/ProfileStack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'EditProfileScreen'>;

// ── Grad year options ─────────────────────────────────────────────────────────
const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028', '2029'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditProfileScreen({ navigation }: Props) {
  const { user, updateUser } = useAuth();

  const [fullName,          setFullName]          = useState(user?.full_name ?? '');
  const [bio,               setBio]               = useState(user?.bio ?? '');
  const [college,           setCollege]           = useState(user?.college ?? '');
  const [major,             setMajor]             = useState(user?.major ?? '');
  const [gradYear,          setGradYear]          = useState(String(user?.grad_year ?? ''));
  const [isOpenToReferral,  setIsOpenToReferral]  = useState(user?.is_open_to_referral ?? false);
  const [yearPickerOpen,    setYearPickerOpen]    = useState(false);
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    if (!fullName.trim()) {
      setError('Full name cannot be empty.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await updateMe({
        full_name:          fullName.trim()  || undefined,
        bio:                bio.trim()       || undefined,
        college:            college.trim()   || undefined,
        major:              major.trim()     || undefined,
        grad_year:          gradYear ? parseInt(gradYear, 10) : undefined,
        is_open_to_referral: isOpenToReferral,
      });
      // Persist locally so the Profile tab reflects changes immediately
      updateUser(updated);
      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [fullName, bio, college, major, gradYear, isOpenToReferral, updateUser, navigation]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={saving}>
          <Ionicons name="close" size={22} color="#8888AA" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
            <Text style={styles.errorText}> {error}</Text>
          </View>
        )}

        {/* ── Full Name ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            placeholderTextColor="#3A3D55"
            editable={!saving}
          />
        </View>

        {/* ── Bio ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself…"
            placeholderTextColor="#3A3D55"
            multiline
            maxLength={300}
            editable={!saving}
          />
          <Text style={styles.charCount}>{bio.length}/300</Text>
        </View>

        {/* ── College ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>College</Text>
          <TextInput
            style={styles.input}
            value={college}
            onChangeText={setCollege}
            placeholder="e.g. Delhi Technological University"
            placeholderTextColor="#3A3D55"
            editable={!saving}
          />
        </View>

        {/* ── Major / Branch ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Branch / Major</Text>
          <TextInput
            style={styles.input}
            value={major}
            onChangeText={setMajor}
            placeholder="e.g. Electronics & Communication"
            placeholderTextColor="#3A3D55"
            editable={!saving}
          />
        </View>

        {/* ── Grad Year ── */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Graduation Year</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerTrigger]}
            onPress={() => setYearPickerOpen((v) => !v)}
            disabled={saving}
          >
            <Text style={gradYear ? styles.pickerValue : styles.pickerPlaceholder}>
              {gradYear || 'Select year'}
            </Text>
            <Ionicons name={yearPickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#5A5D7A" />
          </TouchableOpacity>
          {yearPickerOpen && (
            <View style={styles.pickerDropdown}>
              {GRAD_YEARS.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.pickerOption, gradYear === year && styles.pickerOptionSelected]}
                  onPress={() => { setGradYear(year); setYearPickerOpen(false); }}
                >
                  <Text style={[styles.pickerOptionText, gradYear === year && styles.pickerOptionTextSelected]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Open to referral ── */}
        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Ionicons name="briefcase-outline" size={18} color="#4FC3F7" />
            <View>
              <Text style={styles.switchTitle}>Open to Referrals</Text>
              <Text style={styles.switchSubtitle}>Let others know you're looking for opportunities</Text>
            </View>
          </View>
          <Switch
            value={isOpenToReferral}
            onValueChange={setIsOpenToReferral}
            trackColor={{ false: '#252840', true: 'rgba(91,139,255,0.4)' }}
            thumbColor={isOpenToReferral ? '#5B8BFF' : '#5A5D7A'}
            disabled={saving}
          />
        </View>

        {/* ── Avatar note ── */}
        <View style={styles.avatarNote}>
          <Ionicons name="image-outline" size={16} color="#44476A" />
          <Text style={styles.avatarNoteText}>Avatar upload coming in a future update.</Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ACCENT    = '#5B8BFF';
const INPUT_BG  = '#1A1D2E';
const BORDER    = '#252840';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D0F1E' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#141626',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2138',
  },
  cancelBtn:    { padding: 4 },
  headerTitle:  { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  saveBtn:      { backgroundColor: ACCENT, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, minWidth: 60, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: 'rgba(91,139,255,0.35)' },
  saveBtnText:  { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ── Form ───────────────────────────────────────────────────────────────────
  container:    { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48, gap: 4 },
  errorBanner:  { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,80,80,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)', padding: 12, marginBottom: 8 },
  errorText:    { color: '#FF6B6B', fontSize: 13, flex: 1 },

  fieldGroup:   { marginBottom: 16 },
  label:        { fontSize: 13, color: '#9A9DB8', fontWeight: '600', marginBottom: 8 },
  input:        { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: '#FFFFFF' },
  bioInput:     { minHeight: 90, textAlignVertical: 'top' },
  charCount:    { color: '#44476A', fontSize: 12, textAlign: 'right', marginTop: 4 },

  // ── Picker ─────────────────────────────────────────────────────────────────
  pickerTrigger:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerPlaceholder:      { color: '#3A3D55', fontSize: 15 },
  pickerValue:            { color: '#FFFFFF', fontSize: 15 },
  pickerDropdown:         { backgroundColor: '#1E2138', borderWidth: 1, borderColor: BORDER, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  pickerOption:           { paddingVertical: 13, paddingHorizontal: 16 },
  pickerOptionSelected:   { backgroundColor: 'rgba(91,139,255,0.15)' },
  pickerOptionText:       { color: '#AAAACC', fontSize: 15 },
  pickerOptionTextSelected: { color: ACCENT, fontWeight: '700' },

  // ── Switch ─────────────────────────────────────────────────────────────────
  switchRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#141626', borderRadius: 12, borderWidth: 1, borderColor: '#1E2138', padding: 14, marginBottom: 16 },
  switchLabel:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  switchTitle:  { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  switchSubtitle: { color: '#7A7D9A', fontSize: 12, marginTop: 2 },

  // ── Avatar note ────────────────────────────────────────────────────────────
  avatarNote:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8 },
  avatarNoteText: { color: '#44476A', fontSize: 12 },
});
