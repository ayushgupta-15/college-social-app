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
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getAuth, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':     return 'No account with this email. Please sign up.';
    case 'auth/wrong-password':         return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':      return 'Too many attempts. Try again later.';
    case 'auth/invalid-email':          return 'Enter a valid email address.';
    case 'auth/user-disabled':          return 'This account has been disabled.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default:                            return 'Login failed. Please try again.';
  }
}

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return; }
    setError(null); setLoading(true);
    try {
      const firebaseAuth  = getAuth();
      const credential    = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      const firebaseToken = await credential.user.getIdToken();
      const { data: user } = await api.post<User>('/auth/login', { firebase_token: firebaseToken });
      await login(firebaseToken, user);
    } catch (err: any) {
      const code = err?.userInfo?.code ?? err?.code ?? '';
      setError(code.startsWith('auth/') ? mapFirebaseError(code) : (err?.message ?? 'An unexpected error occurred.'));
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F1E" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.wave}>👋</Text>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to continue to Campus Connect</Text>
        </View>

        <View style={styles.card}>
          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
              <Text style={styles.errorText}> {error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="alex@example.com"
              placeholderTextColor="#3A3D55"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity><Text style={styles.forgotLink}>Forgot?</Text></TouchableOpacity>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#3A3D55"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass((v) => !v)}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color="#5A5D7A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <View style={styles.btnInner}><ActivityIndicator size="small" color="#FFF" /><Text style={[styles.primaryBtnText, { marginLeft: 10 }]}>Signing in…</Text></View>
              : <Text style={styles.primaryBtnText}>Login</Text>}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google */}
          <Pressable style={styles.googleBtn} disabled={loading}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Google</Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const ACCENT     = '#5B8BFF';
const ACCENT_DIM = 'rgba(91,139,255,0.35)';
const INPUT_BG   = '#1A1D2E';
const BORDER     = '#252840';

const styles = StyleSheet.create({
  flex:      { flex: 1, backgroundColor: '#0D0F1E' },
  container: { flexGrow: 1, backgroundColor: '#0D0F1E', paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40 },

  header:   { alignItems: 'center', marginBottom: 28 },
  wave:     { fontSize: 36, marginBottom: 10 },
  title:    { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#7A7D9A', textAlign: 'center', lineHeight: 20 },

  card: { backgroundColor: '#141626', borderRadius: 20, borderWidth: 1, borderColor: '#1E2138', padding: 24 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,80,80,0.1)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,80,80,0.25)', padding: 12, marginBottom: 16 },
  errorText:   { color: '#FF6B6B', fontSize: 13, flex: 1 },

  fieldGroup: { marginBottom: 18 },
  label:      { fontSize: 13, color: '#9A9DB8', fontWeight: '600', marginBottom: 8 },
  labelRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  forgotLink: { fontSize: 13, color: ACCENT, fontWeight: '600' },

  input:           { backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#FFFFFF' },
  passwordWrapper: { position: 'relative' },
  passwordInput:   { paddingRight: 50 },
  eyeBtn:          { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },

  primaryBtn:         { backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12, elevation: 8 },
  primaryBtnDisabled: { backgroundColor: ACCENT_DIM, shadowOpacity: 0, elevation: 0 },
  primaryBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnInner:           { flexDirection: 'row', alignItems: 'center' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E2138' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#44476A' },

  googleBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: INPUT_BG, borderWidth: 1, borderColor: BORDER, borderRadius: 12, paddingVertical: 14, gap: 10 },
  googleG:    { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  signupRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupPrompt: { fontSize: 14, color: '#7A7D9A' },
  signupLink:   { fontSize: 14, color: ACCENT, fontWeight: '700' },
});
