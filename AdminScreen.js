import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, SafeAreaView,
  RefreshControl, Modal, Image
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabaseClient'
import * as FileSystem from 'expo-file-system'


const GOLD = '#e9e7e1'
const DARK = '#111111'
const SURFACE = '#1a1a1a'
const CARD = '#222222'
const BORDER = '#333333'
const MUTED = '#888888'
const WHITE = '#f0f0f0'
const RED = '#e57373'
const GREEN = '#4CAF50'

const estadoColor = { confirmada: GREEN, cancelada: RED, completada: GOLD }

function formatFecha(fecha) {
  if (!fecha) return ''
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function getNextDays(n = 30) {
  const days = []
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  for (let i = 0; i <= n; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    days.push({
      date: d.toISOString().split('T')[0],
      label: dayNames[d.getDay()],
      num: d.getDate(),
      esDomingo: d.getDay() === 0,
    })
  }
  return days
}

function getSlots(inicio = '09:00', fin = '19:00', dur = 30) {
  const slots = []
  let [h, m] = inicio.split(':').map(Number)
  const [fh, fm] = fin.split(':').map(Number)
  while (h < fh || (h === fh && m < fm)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    m += dur
    if (m >= 60) { h++; m -= 60 }
  }
  return slots
}

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Avatar del barbero ───────────────────────────────────────
function BarberoAvatar({ barbero, size = 48 }) {
  const [error, setError] = useState(false)
  if (barbero.foto_url && !error) {
    return (
      <Image
        source={{ uri: barbero.foto_url }}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: GOLD }}
        onError={() => setError(true)}
      />
    )
  }
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.33 }]}>{initials(barbero.nombre)}</Text>
    </View>
  )
}

// ─── Modal: Crear / Editar Barbero con foto ───────────────────
function BarberoModal({ visible, barbero, onClose, onSaved }) {
  const [nombre, setNombre] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [fotoUri, setFotoUri] = useState(null)
  const [fotoUrl, setFotoUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  useEffect(() => {
    if (barbero) {
      setNombre(barbero.nombre || '')
      setEspecialidad(barbero.especialidad || '')
      setFotoUrl(barbero.foto_url || null)
      setFotoUri(null)
    } else {
      setNombre(''); setEspecialidad(''); setFotoUri(null); setFotoUrl(null)
    }
  }, [barbero, visible])

  async function seleccionarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri)
    }
  }

  async function subirFoto(uri) {
  setUploadingFoto(true)

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    const ext = uri.split('.').pop() || 'jpg'
    const fileName = `barbero_${Date.now()}.${ext}`

    const contentType = ext === 'png'
      ? 'image/png'
      : 'image/jpeg'

    const { error: uploadError } = await supabase.storage
      .from('barberos')
      .upload(fileName, decode(base64), {
        contentType,
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('barberos')
      .getPublicUrl(fileName)

    setUploadingFoto(false)

    return data.publicUrl

  } catch (e) {
    setUploadingFoto(false)
    Alert.alert('Error subiendo foto', e.message)
    return null
  }
}

  async function guardar() {
    if (!nombre.trim()) { Alert.alert('Falta el nombre'); return }
    setLoading(true)

    let urlFinal = fotoUrl
    if (fotoUri) {
      urlFinal = await subirFoto(fotoUri)
      if (!urlFinal) { setLoading(false); return }
    }

    let error
    if (barbero?.id) {
      ;({ error } = await supabase.from('barberos')
        .update({ nombre: nombre.trim(), especialidad: especialidad.trim() || null, foto_url: urlFinal })
        .eq('id', barbero.id))
    } else {
      ;({ error } = await supabase.from('barberos')
        .insert({ nombre: nombre.trim(), especialidad: especialidad.trim() || null, foto_url: urlFinal, activo: true }))
    }
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    onSaved()
    onClose()
  }

  const fotoMostrar = fotoUri || fotoUrl

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={modal.box}>
          <Text style={modal.title}>{barbero?.id ? 'EDITAR BARBERO' : 'NUEVO BARBERO'}</Text>

          {/* Foto */}
          <TouchableOpacity style={modal.fotoBtn} onPress={seleccionarFoto}>
            {fotoMostrar
              ? <Image source={{ uri: fotoMostrar }} style={modal.fotoPreview} />
              : <View style={modal.fotoPlaceholder}>
                  <Text style={{ fontSize: 32 }}>📷</Text>
                  <Text style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>Toca para agregar foto</Text>
                </View>
            }
            {fotoMostrar && (
              <View style={modal.fotoOverlay}>
                <Text style={{ color: WHITE, fontSize: 11 }}>✏️ Cambiar</Text>
              </View>
            )}
          </TouchableOpacity>

          {uploadingFoto && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ActivityIndicator color={GOLD} size="small" />
              <Text style={{ color: MUTED, fontSize: 12 }}>Subiendo foto...</Text>
            </View>
          )}

          <Text style={modal.label}>NOMBRE *</Text>
          <TextInput
            style={modal.input}
            placeholder="Ej: Carlos Mendoza"
            placeholderTextColor={MUTED}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={modal.label}>ESPECIALIDAD</Text>
          <TextInput
            style={modal.input}
            placeholder="Ej: Corte clásico, degradados"
            placeholderTextColor={MUTED}
            value={especialidad}
            onChangeText={setEspecialidad}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={modal.btnCancel} onPress={onClose}>
              <Text style={modal.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modal.btnSave, (loading || uploadingFoto) && { opacity: 0.5 }]}
              onPress={guardar} disabled={loading || uploadingFoto}
            >
              {loading
                ? <ActivityIndicator color="#111" />
                : <Text style={modal.btnSaveText}>Guardar</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ─── Modal: Historial de cliente ─────────────────────────────
function HistorialModal({ visible, onClose }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function buscar() {
    if (!busqueda.trim()) return
    setLoading(true); setBuscado(true)
    const { data } = await supabase.from('citas')
      .select('*, barberos(nombre)')
      .ilike('cliente_nombre', `%${busqueda.trim()}%`)
      .order('fecha', { ascending: false })
      .limit(30)
    setResultados(data || [])
    setLoading(false)
  }

  function cerrar() { setBusqueda(''); setResultados([]); setBuscado(false); onClose() }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={[modal.box, { maxHeight: '85%' }]}>
          <Text style={modal.title}>HISTORIAL POR CLIENTE</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <TextInput
              style={[modal.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Nombre del cliente..."
              placeholderTextColor={MUTED}
              value={busqueda}
              onChangeText={setBusqueda}
              onSubmitEditing={buscar}
            />
            <TouchableOpacity style={modal.btnSave} onPress={buscar}>
              <Text style={modal.btnSaveText}>🔍</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 400 }}>
            {loading && <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />}
            {!loading && buscado && resultados.length === 0 && (
              <Text style={{ color: MUTED, textAlign: 'center', marginTop: 20 }}>No se encontraron citas</Text>
            )}
            {resultados.map(c => (
              <View key={c.id} style={hist.row}>
                <View style={{ flex: 1 }}>
                  <Text style={hist.cliente}>{c.cliente_nombre}</Text>
                  <Text style={hist.meta}>{c.barberos?.nombre} · {formatFecha(c.fecha)} · {c.hora_inicio?.slice(0, 5)}</Text>
                  {c.cliente_contacto && <Text style={hist.meta}>📱 {c.cliente_contacto}</Text>}
                </View>
                <View style={[hist.badge, { borderColor: estadoColor[c.estado] || MUTED, backgroundColor: (estadoColor[c.estado] || MUTED) + '22' }]}>
                  <Text style={[hist.badgeText, { color: estadoColor[c.estado] || MUTED }]}>{c.estado}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[modal.btnCancel, { marginTop: 12 }]} onPress={cerrar}>
            <Text style={modal.btnCancelText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Modal: Bloqueos ─────────────────────────────────────────
function BloqueoModal({ visible, onClose, barberos }) {
  const [barberoId, setBarberoId] = useState(null)
  const [fecha, setFecha] = useState(null)
  const [bloqueoDia, setBloqueoDia] = useState(false)
  const [slotsBlock, setSlotsBlock] = useState([])
  const [bloqueos, setBloqueos] = useState([])
  const [loading, setLoading] = useState(false)
  const dias = getNextDays(30)
  const slots = getSlots()

  useEffect(() => { if (visible) cargarBloqueos() }, [visible])

  async function cargarBloqueos() {
    const { data } = await supabase.from('bloqueos').select('*, barberos(nombre)').order('fecha')
    setBloqueos(data || [])
  }

  async function guardar() {
    if (!barberoId || !fecha) { Alert.alert('Selecciona barbero y fecha'); return }
    if (!bloqueoDia && slotsBlock.length === 0) { Alert.alert('Selecciona horarios o activa día completo'); return }
    setLoading(true)
    const { error } = await supabase.from('bloqueos').insert({
      barbero_id: barberoId, fecha, dia_completo: bloqueoDia,
      slots_bloqueados: bloqueoDia ? null : slotsBlock,
    })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    setBarberoId(null); setFecha(null); setBloqueoDia(false); setSlotsBlock([])
    cargarBloqueos()
    Alert.alert('✓ Bloqueo guardado')
  }

  async function eliminarBloqueo(id) {
    await supabase.from('bloqueos').delete().eq('id', id)
    setBloqueos(prev => prev.filter(b => b.id !== id))
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modal.overlay}>
        <View style={[modal.box, { maxHeight: '90%' }]}>
          <Text style={modal.title}>BLOQUEAR DÍAS / HORARIOS</Text>
          <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={false}>
            <Text style={modal.label}>BARBERO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {barberos.filter(b => b.activo).map(b => (
                  <TouchableOpacity key={b.id} style={[blq.chip, barberoId === b.id && blq.chipActive]} onPress={() => setBarberoId(b.id)}>
                    <Text style={[blq.chipText, barberoId === b.id && { color: GOLD }]}>{b.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={modal.label}>FECHA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {dias.filter(d => !d.esDomingo).map(d => (
                  <TouchableOpacity key={d.date} style={[blq.dateChip, fecha === d.date && blq.chipActive]} onPress={() => setFecha(d.date)}>
                    <Text style={[{ fontSize: 9, color: MUTED }, fecha === d.date && { color: GOLD }]}>{d.label}</Text>
                    <Text style={[{ fontSize: 18, color: WHITE, fontWeight: '700' }, fecha === d.date && { color: GOLD }]}>{d.num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[blq.chip, bloqueoDia && blq.chipActive, { marginBottom: 14, alignSelf: 'flex-start' }]}
              onPress={() => { setBloqueoDia(!bloqueoDia); setSlotsBlock([]) }}>
              <Text style={[blq.chipText, bloqueoDia && { color: GOLD }]}>🔒 Bloquear día completo</Text>
            </TouchableOpacity>
            {!bloqueoDia && (
              <>
                <Text style={modal.label}>HORARIOS A BLOQUEAR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                  {slots.map(s => (
                    <TouchableOpacity key={s} style={[blq.slotChip, slotsBlock.includes(s) && blq.slotChipActive]}
                      onPress={() => setSlotsBlock(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}>
                      <Text style={[{ fontSize: 11, color: MUTED }, slotsBlock.includes(s) && { color: RED }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <TouchableOpacity style={[modal.btnSave, { marginBottom: 20 }, loading && { opacity: 0.5 }]} onPress={guardar} disabled={loading}>
              {loading ? <ActivityIndicator color="#111" /> : <Text style={modal.btnSaveText}>Guardar bloqueo</Text>}
            </TouchableOpacity>
            {bloqueos.length > 0 && (
              <>
                <Text style={[modal.label, { marginBottom: 10 }]}>BLOQUEOS ACTIVOS</Text>
                {bloqueos.map(b => (
                  <View key={b.id} style={blq.bloqueoRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: WHITE, fontSize: 13 }}>{b.barberos?.nombre} · {formatFecha(b.fecha)}</Text>
                      <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                        {b.dia_completo ? '🔒 Día completo' : `🕐 ${(b.slots_bloqueados || []).join(', ')}`}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarBloqueo(b.id)} style={{ padding: 4 }}>
                      <Text style={{ color: RED, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={[modal.btnCancel, { marginTop: 10 }]} onPress={onClose}>
            <Text style={modal.btnCancelText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Pantalla principal Admin ─────────────────────────────────
export default function AdminScreen({ session }) {
  const [tab, setTab] = useState('citas')
  const [citas, setCitas] = useState([])
  const [barberos, setBarberos] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filtroBarbero, setFiltroBarbero] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [modalBarbero, setModalBarbero] = useState(false)
  const [barberoEditar, setBarberoEditar] = useState(null)
  const [modalHistorial, setModalHistorial] = useState(false)
  const [modalBloqueo, setModalBloqueo] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from('citas').select('*, barberos(nombre)').order('fecha', { ascending: false }).order('hora_inicio', { ascending: true }),
      supabase.from('barberos').select('*').order('nombre'),
    ])
    if (c) setCitas(c)
    if (b) setBarberos(b)
    setLoading(false)
  }

  async function onRefresh() { setRefreshing(true); await loadAll(); setRefreshing(false) }

  async function cambiarEstado(id, estado) {
    Alert.alert('Cambiar estado', `¿Marcar como "${estado}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        await supabase.from('citas').update({ estado }).eq('id', id)
        setCitas(prev => prev.map(c => c.id === id ? { ...c, estado } : c))
      }}
    ])
  }

  async function toggleBarbero(id, activo) {
    await supabase.from('barberos').update({ activo: !activo }).eq('id', id)
    setBarberos(prev => prev.map(b => b.id === id ? { ...b, activo: !activo } : b))
  }

  async function eliminarBarbero(id, nombre) {
    Alert.alert('Eliminar barbero', `¿Eliminar a ${nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('barberos').delete().eq('id', id)
        if (error) { Alert.alert('Error', error.message); return }
        setBarberos(prev => prev.filter(b => b.id !== id))
      }}
    ])
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => supabase.auth.signOut() }
    ])
  }

  const hoy = new Date().toISOString().split('T')[0]
  const citasFiltradas = citas.filter(c => {
    if (filtroBarbero !== 'todos' && c.barbero_id !== filtroBarbero) return false
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    return true
  })
  const citasHoy = citas.filter(c => c.fecha === hoy).length
  const citasPendientes = citas.filter(c => c.estado === 'confirmada' && c.fecha >= hoy).length

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ADMIN · TAURO</Text>
          {session?.user?.email && <Text style={styles.headerEmail}>{session.user.email}</Text>}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Salir 🚪</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {[['citas', 'Citas'], ['barberos', 'Barberos']].map(([key, label]) => (
          <TouchableOpacity key={key} style={styles.tab} onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            {tab === key && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}>

        {tab === 'citas' && (
          <View>
            <View style={styles.statGrid}>
              {[[String(citasHoy), 'Hoy'], [String(citasPendientes), 'Pendientes'], [String(citas.length), 'Total'], [String(barberos.filter(b => b.activo).length), 'Barberos']].map(([num, label]) => (
                <View key={label} style={styles.statCard}>
                  <Text style={styles.statNum}>{num}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.quickBtn, { borderColor: GOLD }]} onPress={() => setModalHistorial(true)}>
                <Text style={[styles.quickBtnText, { color: GOLD }]}>🔍 Historial cliente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.quickBtn, { borderColor: MUTED }]} onPress={() => setModalBloqueo(true)}>
                <Text style={[styles.quickBtnText, { color: MUTED }]}>🔒 Bloquear días</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['todos', 'confirmada', 'completada', 'cancelada'].map(est => (
                  <TouchableOpacity key={est} style={[styles.filterChip, filtroEstado === est && styles.filterChipActive]} onPress={() => setFiltroEstado(est)}>
                    <Text style={[styles.filterText, filtroEstado === est && { color: GOLD }]}>
                      {est === 'todos' ? 'Todos' : est.charAt(0).toUpperCase() + est.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.filterChip, filtroBarbero === 'todos' && styles.filterChipActive]} onPress={() => setFiltroBarbero('todos')}>
                  <Text style={[styles.filterText, filtroBarbero === 'todos' && { color: GOLD }]}>Todos</Text>
                </TouchableOpacity>
                {barberos.map(b => (
                  <TouchableOpacity key={b.id} style={[styles.filterChip, filtroBarbero === b.id && styles.filterChipActive]} onPress={() => setFiltroBarbero(b.id)}>
                    <Text style={[styles.filterText, filtroBarbero === b.id && { color: GOLD }]}>{b.nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {loading
              ? <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 40 }} />
              : citasFiltradas.length === 0
                ? <Text style={{ color: MUTED, textAlign: 'center', marginTop: 40 }}>No hay citas</Text>
                : citasFiltradas.map(c => (
                  <View key={c.id} style={[styles.citaCard, c.fecha === hoy && { borderColor: GOLD + '66' }]}>
                    <View style={styles.citaHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.citaCliente}>{c.cliente_nombre}</Text>
                        <Text style={styles.citaMeta}>{c.barberos?.nombre} · {formatFecha(c.fecha)} · {c.hora_inicio?.slice(0, 5)}</Text>
                        {c.cliente_contacto && <Text style={styles.citaMeta}>📱 {c.cliente_contacto}</Text>}
                      </View>
                      <View style={[styles.estadoBadge, { backgroundColor: (estadoColor[c.estado] || MUTED) + '22', borderColor: estadoColor[c.estado] || MUTED }]}>
                        <Text style={[styles.estadoText, { color: estadoColor[c.estado] || MUTED }]}>{c.estado}</Text>
                      </View>
                    </View>
                    <View style={styles.citaActions}>
                      {c.estado !== 'completada' && (
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: GOLD }]} onPress={() => cambiarEstado(c.id, 'completada')}>
                          <Text style={[styles.actionBtnText, { color: GOLD }]}>✓ Completar</Text>
                        </TouchableOpacity>
                      )}
                      {c.estado !== 'cancelada' && (
                        <TouchableOpacity style={[styles.actionBtn, { borderColor: RED }]} onPress={() => cambiarEstado(c.id, 'cancelada')}>
                          <Text style={[styles.actionBtnText, { color: RED }]}>✕ Cancelar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))
            }
          </View>
        )}

        {tab === 'barberos' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Barberos</Text>
              <TouchableOpacity style={styles.btnAdd} onPress={() => { setBarberoEditar(null); setModalBarbero(true) }}>
                <Text style={styles.btnAddText}>+ Agregar</Text>
              </TouchableOpacity>
            </View>

            {barberos.map(b => {
              const totalCitas = citas.filter(c => c.barbero_id === b.id).length
              return (
                <View key={b.id} style={styles.barberoCard}>
                  <View style={styles.barberoInfo}>
                    <BarberoAvatar barbero={b} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.barberoNombre, !b.activo && { color: MUTED }]}>{b.nombre}</Text>
                      <Text style={styles.barberoSpec}>{b.especialidad || 'Corte de cabello'}</Text>
                      <Text style={styles.barberoSpec}>{totalCitas} citas · {b.activo ? '🟢 Activo' : '🔴 Inactivo'}</Text>
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: GOLD }]} onPress={() => { setBarberoEditar(b); setModalBarbero(true) }}>
                      <Text style={[styles.actionBtnText, { color: GOLD }]}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: b.activo ? RED : GREEN }]} onPress={() => toggleBarbero(b.id, b.activo)}>
                      <Text style={[styles.actionBtnText, { color: b.activo ? RED : GREEN }]}>{b.activo ? 'Desactivar' : 'Activar'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#555' }]} onPress={() => eliminarBarbero(b.id, b.nombre)}>
                      <Text style={[styles.actionBtnText, { color: '#555' }]}>🗑 Eliminar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>

      <BarberoModal visible={modalBarbero} barbero={barberoEditar} onClose={() => setModalBarbero(false)} onSaved={loadAll} />
      <HistorialModal visible={modalHistorial} onClose={() => setModalHistorial(false)} />
      <BloqueoModal visible={modalBloqueo} onClose={() => setModalBloqueo(false)} barberos={barberos} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DARK },
  header: { backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, letterSpacing: 3, color: GOLD, fontWeight: '700' },
  headerEmail: { fontSize: 11, color: MUTED, marginTop: 2 },
  logoutBtn: { borderWidth: 1, borderColor: RED, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: RED, fontSize: 12, fontWeight: '500' },
  tabs: { flexDirection: 'row', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 13, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  tabTextActive: { color: GOLD },
  tabLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD },
  sectionTitle: { fontSize: 18, letterSpacing: 2, color: GOLD, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 14 },
  statNum: { fontSize: 28, color: GOLD, fontWeight: '700' },
  statLabel: { fontSize: 11, color: MUTED, letterSpacing: 1, marginTop: 2 },
  quickBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
  quickBtnText: { fontSize: 12, fontWeight: '500' },
  filterChip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipActive: { borderColor: GOLD, backgroundColor: '#1a1500' },
  filterText: { color: MUTED, fontSize: 12 },
  citaCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 10 },
  citaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  citaCliente: { fontSize: 15, color: WHITE, fontWeight: '500', marginBottom: 4 },
  citaMeta: { fontSize: 12, color: MUTED, marginBottom: 2 },
  estadoBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  estadoText: { fontSize: 11, fontWeight: '500' },
  citaActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 10 },
  actionBtn: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 6, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '500' },
  barberoCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  barberoInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { backgroundColor: '#2a2200', borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: GOLD, fontWeight: '700' },
  barberoNombre: { fontSize: 14, color: WHITE, fontWeight: '500' },
  barberoSpec: { fontSize: 11, color: MUTED, marginTop: 2 },
  btnAdd: { backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnAddText: { color: '#111', fontSize: 13, fontWeight: '700' },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  box: { backgroundColor: SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderTopWidth: 1, borderColor: BORDER },
  title: { fontSize: 14, color: GOLD, letterSpacing: 2, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 10, color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  input: { backgroundColor: DARK, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, color: WHITE, fontSize: 14, marginBottom: 14 },
  btnCancel: { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnCancelText: { color: MUTED, fontSize: 14 },
  btnSave: { flex: 1, backgroundColor: GOLD, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnSaveText: { color: '#111', fontSize: 14, fontWeight: '700' },
  fotoBtn: { alignSelf: 'center', marginBottom: 16, borderRadius: 60, overflow: 'hidden' },
  fotoPreview: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: GOLD },
  fotoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: CARD, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  fotoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#00000088', padding: 6, alignItems: 'center' },
})

const hist = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  cliente: { fontSize: 14, color: WHITE, fontWeight: '500', marginBottom: 2 },
  meta: { fontSize: 11, color: MUTED },
  badge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  badgeText: { fontSize: 10, fontWeight: '500' },
})

const blq = StyleSheet.create({
  chip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { borderColor: GOLD, backgroundColor: '#1a1500' },
  chipText: { color: MUTED, fontSize: 12 },
  dateChip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 52 },
  slotChip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  slotChipActive: { borderColor: RED, backgroundColor: '#2a0000' },
  bloqueoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
})