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

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// ── Firebase error → human-readable message ───────────────────────────────────
function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return 'No account with this email. Please sign up.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    default:
      return 'Login failed. Please try again.';
  }
}

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // ── Email / Password login ─────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      // 1. Firebase sign-in
      await auth().signInWithEmailAndPassword(email.trim(), password);

      // 2. Get ID token
      const firebaseToken = await auth().currentUser!.getIdToken();

      // 3. Exchange with backend (cold start may take ~18s — button stays disabled)
      const { data: user } = await api.post<User>('/auth/login', {
        firebase_token: firebaseToken,
      });

      // 4. Persist session → navigate to MainTabs
      await login(firebaseToken, user);

    } catch (err: any) {
      const code = err?.userInfo?.code ?? err?.code ?? '';
      if (code.startsWith('auth/')) {
        setError(mapFirebaseError(code));
      } else {
        // Backend error
        setError(err?.message ?? 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google sign-in placeholder ─────────────────────────────────────────────
  const handleGoogle = () => {
    setError('Google sign-in coming soon.');
  };

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
          <Text style={styles.emoji}>👋</Text>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Login to continue to{'\n'}Campus Connect
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Error banner */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="alex@example.com"
              placeholderTextColor="#44445A"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor="#44445A"
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
              >
                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login button */}
          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.btnInner}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[styles.primaryBtnText, { marginLeft: 10 }]}>
                  Signing in…
                </Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Login</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google button */}
          <Pressable
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={loading}
          >
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Google</Text>
          </Pressable>

          {/* Sign up link */}
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
const INPUT_BG    = '#12122A';
const BORDER      = '#2A2A4A';
const ACCENT      = '#7C6FE0';
const ACCENT_DIM  = 'rgba(124, 111, 224, 0.45)';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0A0A1A' },

  container: {
    flexGrow: 1,
    backgroundColor: '#0A0A1A',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  emoji: { fontSize: 36, marginBottom: 10 },
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
    lineHeight: 20,
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
    color: '#FF6B6B',
    fontSize: 13,
    lineHeight: 18,
  },

  // ── Fields ─────────────────────────────────────────────────────────────────
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    color: '#AAAACC',
    fontWeight: '600',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotLink: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },

  // ── Primary button ─────────────────────────────────────────────────────────
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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

  // ── Divider ────────────────────────────────────────────────────────────────
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1E1E38',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#55557A',
  },

  // ── Google button ──────────────────────────────────────────────────────────
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 10,
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── Sign up row ────────────────────────────────────────────────────────────
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signupPrompt: {
    fontSize: 14,
    color: '#8888AA',
  },
  signupLink: {
    fontSize: 14,
    color: ACCENT,
    fontWeight: '700',
  },
});
