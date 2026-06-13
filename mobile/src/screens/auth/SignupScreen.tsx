import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

// ── Grad year picker options ───────────────────────────────────────────────────
const GRAD_YEARS = ['2024', '2025', '2026', '2027', '2028'];

// ── Form state ────────────────────────────────────────────────────────────────
interface FormState {
  fullName: string;
  email: string;
  college: string;
  branch: string;
  gradYear: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  college?: string;
  branch?: string;
  gradYear?: string;
  password?: string;
  confirmPassword?: string;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validate(form: FormState): FormErrors {
  const errs: FormErrors = {};
  if (!form.fullName.trim())              errs.fullName = 'Full name is required';
  if (!form.email.trim())                 errs.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(form.email))
                                          errs.email    = 'Enter a valid email address';
  if (!form.college.trim())               errs.college  = 'College is required';
  if (!form.branch.trim())               errs.branch   = 'Branch is required';
  if (!form.gradYear)                    errs.gradYear = 'Select a graduation year';
  if (!form.password)                    errs.password = 'Password is required';
  else if (form.password.length < 8)    errs.password = 'Minimum 8 characters';
  if (!form.confirmPassword)             errs.confirmPassword = 'Please confirm your password';
  else if (form.password !== form.confirmPassword)
                                         errs.confirmPassword = 'Passwords do not match';
  return errs;
}

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please login.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 8 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Sign up failed. Please try again.';
  }
}

export default function SignupScreen({ navigation }: Props) {
  const { login } = useAuth();

  const [form, setForm] = useState<FormState>({
    fullName: '',
    email: '',
    college: '',
    branch: '',
    gradYear: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors]           = useState<FormErrors>({});
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);
  const [yearOpen, setYearOpen]       = useState(false);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setApiError(null);
  };

  const handleSignup = async () => {
    // 1. Local validation
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    if (!termsAgreed) {
      setApiError('Please agree to the Terms & Conditions.');
      return;
    }

    setApiError(null);
    setLoading(true);

    try {
      // 2. Create Firebase account
      await auth().createUserWithEmailAndPassword(
        form.email.trim(),
        form.password,
      );

      // 3. Get ID token
      const firebaseToken = await auth().currentUser!.getIdToken();

      // 4. Derive username from email local part (backend requires it)
      const username = form.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

      // 5. POST /auth/signup
      const { data: user } = await api.post<User>('/auth/signup', {
        firebase_token: firebaseToken,
        username,
        full_name:  form.fullName.trim(),
        college:    form.college.trim(),
        major:      form.branch.trim(),
        grad_year:  parseInt(form.gradYear, 10),
      });

      // 6. Persist session → navigate to MainTabs
      await login(firebaseToken, user);

    } catch (err: any) {
      // If backend call failed but Firebase user was created, delete the orphan account
      if (auth().currentUser && err?.code === undefined) {
        await auth().currentUser!.delete().catch(() => {});
      }

      const code = err?.userInfo?.code ?? err?.code ?? '';
      if (code.startsWith('auth/')) {
        setApiError(mapFirebaseError(code));
      } else {
        setApiError(err?.message ?? 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render helper: labelled input ─────────────────────────────────────────
  const Field = ({
    label,
    fieldKey,
    placeholder,
    keyboard = 'default',
    autoCapitalize = 'words',
  }: {
    label: string;
    fieldKey: keyof FormState;
    placeholder: string;
    keyboard?: 'default' | 'email-address';
    autoCapitalize?: 'none' | 'words' | 'sentences';
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[fieldKey] && styles.inputError]}
        placeholder={placeholder}
        placeholderTextColor="#44445A"
        value={form[fieldKey]}
        onChangeText={(v) => updateField(fieldKey, v)}
        keyboardType={keyboard}
        autoCapitalize={autoCapitalize}
        editable={!loading}
      />
      {errors[fieldKey] && (
        <Text style={styles.fieldError}>{errors[fieldKey]}</Text>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A1A" />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join thousands of students on Campus Connect
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* API-level error */}
          {apiError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {apiError}</Text>
            </View>
          )}

          {/* ── Fields ── */}
          <Field
            label="Full Name"
            fieldKey="fullName"
            placeholder="Alex Roy"
          />

          <Field
            label="Email"
            fieldKey="email"
            placeholder="alex@example.com"
            keyboard="email-address"
            autoCapitalize="none"
          />

          <Field
            label="College"
            fieldKey="college"
            placeholder="Delhi Technological University"
          />

          <Field
            label="Branch"
            fieldKey="branch"
            placeholder="Electronics & Communication"
          />

          {/* Grad Year — inline picker */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Graduation Year</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerTrigger, errors.gradYear && styles.inputError]}
              onPress={() => setYearOpen((v) => !v)}
              disabled={loading}
            >
              <Text style={form.gradYear ? styles.pickerValue : styles.pickerPlaceholder}>
                {form.gradYear || 'Select year'}
              </Text>
              <Text style={styles.pickerCaret}>{yearOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {yearOpen && (
              <View style={styles.pickerDropdown}>
                {GRAD_YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerOption,
                      form.gradYear === year && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      updateField('gradYear', year);
                      setYearOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        form.gradYear === year && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {errors.gradYear && (
              <Text style={styles.fieldError}>{errors.gradYear}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Min. 8 characters"
                placeholderTextColor="#44445A"
                value={form.password}
                onChangeText={(v) => updateField('password', v)}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="••••••••"
                placeholderTextColor="#44445A"
                value={form.confirmPassword}
                onChangeText={(v) => updateField('confirmPassword', v)}
                secureTextEntry={!showConfirm}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAgreed((v) => !v)}
            disabled={loading}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
              {termsAgreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </Text>
          </TouchableOpacity>

          {/* Sign Up button */}
          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.primaryBtnText, { marginLeft: 10 }]}>
                  Creating account…
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Sign Up</Text>
            )}
          </Pressable>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginPrompt}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const INPUT_BG   = '#12122A';
const BORDER     = '#2A2A4A';
const ACCENT     = '#7C6FE0';
const ACCENT_DIM = 'rgba(124, 111, 224, 0.45)';
const ERROR_RED  = '#FF6B6B';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0A0A1A' },

  container: {
    flexGrow: 1,
    backgroundColor: '#0A0A1A',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 48,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#8888AA',
    textAlign: 'center',
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#10101E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E1E38',
    padding: 24,
  },

  // ── Error ──────────────────────────────────────────────────────────────────
  errorBanner: {
    backgroundColor: 'rgba(255, 80, 80, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 80, 80, 0.3)',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: ERROR_RED,
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Fields ─────────────────────────────────────────────────────────────────
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: '#AAAACC',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#FFFFFF',
  },
  inputError: {
    borderColor: ERROR_RED,
  },
  fieldError: {
    color: ERROR_RED,
    fontSize: 12,
    marginTop: 5,
  },

  // ── Password ───────────────────────────────────────────────────────────────
  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },

  // ── Grad Year picker ───────────────────────────────────────────────────────
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerPlaceholder: { color: '#44445A', fontSize: 15 },
  pickerValue:       { color: '#FFFFFF', fontSize: 15 },
  pickerCaret:       { color: '#8888AA', fontSize: 11 },
  pickerDropdown: {
    backgroundColor: '#1A1A30',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(124, 111, 224, 0.15)',
  },
  pickerOptionText: {
    color: '#AAAACC',
    fontSize: 15,
  },
  pickerOptionTextSelected: {
    color: ACCENT,
    fontWeight: '700',
  },

  // ── Terms ──────────────────────────────────────────────────────────────────
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: '#8888AA',
    lineHeight: 18,
  },
  termsLink: {
    color: ACCENT,
    fontWeight: '600',
  },

  // ── Primary button ─────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: ACCENT_DIM,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Login row ──────────────────────────────────────────────────────────────
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  loginPrompt: {
    fontSize: 14,
    color: '#8888AA',
  },
  loginLink: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '700',
  },
});
