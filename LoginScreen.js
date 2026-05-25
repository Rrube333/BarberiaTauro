import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { supabase } from './supabaseClient'

const GOLD = '#eceae2'
const DARK = '#111111'
const CARD = '#1a1a1a'
const BORDER = '#333333'
const MUTED = '#888888'
const WHITE = '#f0f0f0'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu email y contraseña')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error de acceso', 'Email o contraseña incorrectos')
    }
    // Si no hay error, el listener en App.js detecta la sesión automáticamente
  }

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        {/* Logo / Header */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}></Text>
          </View>
          <Text style={styles.title}>TAURO</Text>
          <Text style={styles.subtitle}>BARBERÍA · PANEL ADMIN</Text>
          <View style={styles.divider} />
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>ACCESO ADMINISTRADOR</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@tauro.com"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>CONTRASEÑA</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass(!showPass)}
              >
                <Text style={styles.eyeIcon}>{showPass ? '' : ''}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.btnLogin, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#111" />
              : <Text style={styles.btnLoginText}>INGRESAR</Text>
            }
          </TouchableOpacity>

          <Text style={styles.hint}>Solo el administrador puede acceder a este panel.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DARK },
  inner: { flex: 1, justifyContent: 'center', padding: 28 },

  hero: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1a1200',
    borderWidth: 2, borderColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logoIcon: { fontSize: 30 },
  title: { fontSize: 36, letterSpacing: 8, color: GOLD, fontWeight: '700' },
  subtitle: { fontSize: 10, color: MUTED, letterSpacing: 3, marginTop: 4 },
  divider: { width: 40, height: 2, backgroundColor: GOLD, marginTop: 16, opacity: 0.6 },

  form: {
    backgroundColor: CARD,
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 16, padding: 24,
  },
  formTitle: { fontSize: 12, color: MUTED, letterSpacing: 2, marginBottom: 20, textAlign: 'center' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 10, color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  input: {
    backgroundColor: '#111',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 8, padding: 14,
    color: WHITE, fontSize: 14,
    marginBottom: 0,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 10 },
  eyeIcon: { fontSize: 18 },

  btnLogin: {
    backgroundColor: GOLD,
    borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  btnLoginText: { color: '#111', fontSize: 15, fontWeight: '700', letterSpacing: 3 },
  btnDisabled: { opacity: 0.5 },

  hint: { fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 16 },
})
