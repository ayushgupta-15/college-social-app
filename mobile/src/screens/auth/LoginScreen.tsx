import React, { useEffect, useState } from 'react';
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
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
} from '@react-native-firebase/auth';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { User } from '../../types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const GOOGLE_WEB_CLIENT_ID = '756729893068-ogue2g91u2cihcvcuc8gfefqicnh9e6q.apps.googleusercontent.com';

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.568 2.684-3.876 2.684-6.616Z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z"
      />
      <Path
        fill="#FBBC05"
        d="M3.964 10.711A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.711V4.957H.957A9.003 9.003 0 0 0 0 9c0 1.452.348 2.826.957 4.043l3.007-2.332Z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.582C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.957L3.964 7.29C4.672 5.162 6.656 3.58 9 3.58Z"
      />
    </Svg>
  );
}

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

function mapGoogleError(err: any): string {
  const code = err?.code ?? '';
  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return '';
    case statusCodes.IN_PROGRESS:
      return 'Google login is already in progress.';
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Google Play Services is not available or needs an update.';
    default:
      return err?.message ?? 'Google login failed. Please try again.';
  }
}

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  }, []);

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

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const googleUser = await GoogleSignin.signIn();
      if (googleUser.type === 'cancelled') {
        return;
      }

      let idToken = googleUser.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error('Google did not return an ID token.');
      }

      const firebaseAuth = getAuth();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const credential = await signInWithCredential(firebaseAuth, googleCredential);
      const firebaseToken = await credential.user.getIdToken();

      try {
        const { data: user } = await api.post<User>('/auth/login', { firebase_token: firebaseToken });
        await login(firebaseToken, user);
      } catch (apiErr: any) {
        // New Google user — no account in DB yet. Send them to Signup with token pre-filled.
        const msg: string = apiErr?.response?.data?.message ?? apiErr?.message ?? '';
        if (msg.includes('no account found') || apiErr?.response?.status === 404) {
          const googleEmail: string = credential.user.email ?? '';
          const googleName: string  = credential.user.displayName ?? '';
          navigation.navigate('Signup', {
            prefillFirebaseToken: firebaseToken,
            prefillEmail: googleEmail,
            prefillFullName: googleName,
          });
        } else {
          throw apiErr;
        }
      }
    } catch (err: any) {
      const googleMessage = mapGoogleError(err);
      if (googleMessage) {
        console.warn('Google login error:', err);
        setError(googleMessage);
      }
    } finally {
      setLoading(false);
    }
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
          <Pressable
            style={({ pressed }) => [
              styles.googleBtn,
              pressed && !loading && styles.googleBtnPressed,
              loading && styles.googleBtnDisabled,
            ]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <GoogleIcon />
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
  googleBtnPressed: { opacity: 0.85 },
  googleBtnDisabled: { opacity: 0.6 },
  googleText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  signupRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  signupPrompt: { fontSize: 14, color: '#7A7D9A' },
  signupLink:   { fontSize: 14, color: ACCENT, fontWeight: '700' },
});
