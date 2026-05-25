import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, ActivityIndicator,
  Alert, SafeAreaView, Modal
} from 'react-native'
import { supabase } from './supabaseClient'

const GOLD = '#ecebe7'
const DARK = '#111111'
const SURFACE = '#1a1a1a'
const CARD = '#222222'
const BORDER = '#333333'
const MUTED = '#888888'
const WHITE = '#f0f0f0'
const RED = '#e57373'

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function getNextDays(n = 14) {
  const days = []
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  for (let i = 1; i <= n; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    if (d.getDay() !== 0) {
      days.push({
        date: d.toISOString().split('T')[0],
        label: dayNames[d.getDay()],
        num: d.getDate(),
      })
    }
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

function calcFin(hora, dur = 30) {
  let [h, m] = hora.split(':').map(Number)
  m += dur
  if (m >= 60) { h++; m -= 60 }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Modal: Cancelar cita del cliente ────────────────────────
function CancelarCitaModal({ visible, onClose }) {
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(false)
  const [buscado, setBuscado] = useState(false)

  async function buscar() {
    if (!nombre.trim()) { Alert.alert('Ingresa tu nombre'); return }
    setLoading(true)
    setBuscado(true)
    const hoy = new Date().toISOString().split('T')[0]
    let query = supabase.from('citas')
      .select('*, barberos(nombre)')
      .ilike('cliente_nombre', `%${nombre.trim()}%`)
      .eq('estado', 'confirmada')
      .gte('fecha', hoy)
      .order('fecha', { ascending: true })
      .order('hora_inicio', { ascending: true })

    if (contacto.trim()) {
      query = supabase.from('citas')
        .select('*, barberos(nombre)')
        .ilike('cliente_nombre', `%${nombre.trim()}%`)
        .ilike('cliente_contacto', `%${contacto.trim()}%`)
        .eq('estado', 'confirmada')
        .gte('fecha', hoy)
        .order('fecha', { ascending: true })
    }

    const { data } = await query
    setCitas(data || [])
    setLoading(false)
  }

  async function cancelar(cita) {
    Alert.alert(
      'Cancelar cita',
      `¿Seguro que quieres cancelar tu cita del ${formatFecha(cita.fecha)} a las ${cita.hora_inicio?.slice(0, 5)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar', style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('citas')
              .update({ estado: 'cancelada' })
              .eq('id', cita.id)
            if (error) { Alert.alert('Error', error.message); return }
            setCitas(prev => prev.filter(c => c.id !== cita.id))
            Alert.alert('✓ Cita cancelada', 'Tu cita ha sido cancelada correctamente.')
          }
        }
      ]
    )
  }

  function formatFecha(fecha) {
    if (!fecha) return ''
    return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  function cerrar() {
    setNombre(''); setContacto(''); setCitas([]); setBuscado(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mstyles.overlay}>
        <View style={mstyles.box}>
          <Text style={mstyles.title}>CANCELAR MI CITA</Text>
          <Text style={mstyles.hint}>Busca tu cita con tu nombre y opcionalmente tu número.</Text>

          <Text style={mstyles.label}>TU NOMBRE</Text>
          <TextInput
            style={mstyles.input}
            placeholder="Ej: Juan García"
            placeholderTextColor={MUTED}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text style={mstyles.label}>WHATSAPP / TELÉFONO (opcional)</Text>
          <TextInput
            style={mstyles.input}
            placeholder="Ej: 3001234567"
            placeholderTextColor={MUTED}
            keyboardType="phone-pad"
            value={contacto}
            onChangeText={setContacto}
          />

          <TouchableOpacity
            style={[mstyles.btnBuscar, loading && { opacity: 0.5 }]}
            onPress={buscar} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#111" />
              : <Text style={mstyles.btnBuscarText}>🔍 Buscar mis citas</Text>
            }
          </TouchableOpacity>

          <ScrollView style={{ maxHeight: 260 }}>
            {buscado && !loading && citas.length === 0 && (
              <View style={mstyles.emptyBox}>
                <Text style={{ color: MUTED, textAlign: 'center', fontSize: 13 }}>
                  No se encontraron citas pendientes con ese nombre.
                </Text>
              </View>
            )}
            {citas.map(c => (
              <View key={c.id} style={mstyles.citaRow}>
                <View style={{ flex: 1 }}>
                  <Text style={mstyles.citaNombre}>{c.cliente_nombre}</Text>
                  <Text style={mstyles.citaMeta}>
                     {c.barberos?.nombre}
                  </Text>
                  <Text style={mstyles.citaMeta}>
                     {formatFecha(c.fecha)} · {c.hora_inicio?.slice(0, 5)} hrs
                  </Text>
                </View>
                <TouchableOpacity
                  style={mstyles.btnCancelar}
                  onPress={() => cancelar(c)}
                >
                  <Text style={mstyles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[mstyles.btnCerrar, { marginTop: 12 }]} onPress={cerrar}>
            <Text style={mstyles.btnCerrarText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Pantalla principal de reserva ───────────────────────────
export default function ReservaScreen() {
  const [step, setStep] = useState(0)
  const [barberos, setBarberos] = useState([])
  const [barbero, setBarbero] = useState(null)
  const [fecha, setFecha] = useState(null)
  const [hora, setHora] = useState(null)
  const [takenSlots, setTakenSlots] = useState([])
  const [blockedSlots, setBlockedSlots] = useState([])
  const [diaBloqueado, setDiaBloqueado] = useState(false)
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingBarberos, setLoadingBarberos] = useState(true)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [success, setSuccess] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)

  const dias = getNextDays(14)
  const slots = getSlots()

  useEffect(() => {
    supabase.from('barberos').select('*').eq('activo', true).then(({ data }) => {
      if (data) setBarberos(data)
      setLoadingBarberos(false)
    })
  }, [])

  useEffect(() => {
    if (!barbero || !fecha) return
    setLoadingSlots(true)
    setHora(null)

    Promise.all([
      // Slots ya reservados
      supabase.from('citas')
        .select('hora_inicio')
        .eq('barbero_id', barbero.id)
        .eq('fecha', fecha)
        .eq('estado', 'confirmada'),
      // Bloqueos del admin
      supabase.from('bloqueos')
        .select('dia_completo, slots_bloqueados')
        .eq('barbero_id', barbero.id)
        .eq('fecha', fecha),
    ]).then(([{ data: citas }, { data: bloqueos }]) => {
      if (citas) setTakenSlots(citas.map(c => c.hora_inicio.slice(0, 5)))

      if (bloqueos && bloqueos.length > 0) {
        const bloqueo = bloqueos[0]
        if (bloqueo.dia_completo) {
          setDiaBloqueado(true)
          setBlockedSlots([])
        } else {
          setDiaBloqueado(false)
          setBlockedSlots(bloqueo.slots_bloqueados || [])
        }
      } else {
        setDiaBloqueado(false)
        setBlockedSlots([])
      }

      setLoadingSlots(false)
    })
  }, [barbero, fecha])

  async function confirmar() {
    if (!nombre.trim()) { Alert.alert('Falta tu nombre'); return }
    setLoading(true)
    const { error } = await supabase.from('citas').insert({
      barbero_id: barbero.id,
      cliente_nombre: nombre.trim(),
      cliente_contacto: contacto.trim() || null,
      fecha,
      hora_inicio: hora + ':00',
      hora_fin: calcFin(hora) + ':00',
      estado: 'confirmada',
    })
    setLoading(false)
    if (error) { Alert.alert('Error', error.message); return }
    setSuccess(true)
  }

  function reset() {
    setBarbero(null); setFecha(null); setHora(null)
    setNombre(''); setContacto(''); setSuccess(false); setStep(0)
    setTakenSlots([]); setBlockedSlots([]); setDiaBloqueado(false)
  }

  // ─── Pantalla de éxito ───────────────────────────────────
  if (success) return (
    <SafeAreaView style={styles.page}>
      <View style={styles.successBox}>
        <View style={styles.successIcon}>
          <Text style={{ fontSize: 32, color: '#4CAF50' }}>✓</Text>
        </View>
        <Text style={styles.successTitle}>¡Cita Reservada!</Text>
        <Text style={styles.successSub}>Te esperamos, {nombre}.</Text>
        <Text style={styles.successSub}>{barbero?.nombre} · {hora} hrs</Text>
        <TouchableOpacity style={[styles.btnGold, { marginTop: 32 }]} onPress={reset}>
          <Text style={styles.btnGoldText}>Nueva reserva</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnOutline, { marginTop: 12 }]}
          onPress={() => { reset(); setModalCancelar(true) }}
        >
          <Text style={styles.btnOutlineText}>¿Necesitas cancelar una cita?</Text>
        </TouchableOpacity>
      </View>
      <CancelarCitaModal visible={modalCancelar} onClose={() => setModalCancelar(false)} />
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>TAURO BARBERÍA</Text>
        <Text style={styles.heroSub}>RESERVA TU CITA</Text>
      </View>

      {/* Tabs de pasos */}
      <View style={styles.tabs}>
        {['① Barbero', '② Fecha', '③ Datos', '④ Confirmar'].map((label, i) => (
          <TouchableOpacity
            key={i} style={styles.tab}
            onPress={() => i < step && setStep(i)}
            disabled={i > step}
          >
            <Text style={[styles.tabText, step === i && styles.tabTextActive]}>{label}</Text>
            {step === i && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>

        {/* ── PASO 0: Barbero ── */}
        {step === 0 && (
          <View>
            <Text style={styles.sectionTitle}>Elige tu barbero</Text>
            {loadingBarberos && <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />}
            <View style={styles.barberGrid}>
              {barberos.map(b => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.barberCard, barbero?.id === b.id && styles.barberCardSelected]}
                  onPress={() => { setBarbero(b); setFecha(null); setHora(null) }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(b.nombre)}</Text>
                  </View>
                  <Text style={styles.barberName}>{b.nombre}</Text>
                  <Text style={styles.barberSpec}>{b.especialidad || 'Corte de cabello'}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnGold, !barbero && styles.btnDisabled, { marginTop: 24 }]}
              onPress={() => setStep(1)} disabled={!barbero}
            >
              <Text style={styles.btnGoldText}>Siguiente →</Text>
            </TouchableOpacity>

            {/* Botón cancelar cita */}
            <TouchableOpacity
              style={[styles.btnOutline, { marginTop: 12 }]}
              onPress={() => setModalCancelar(true)}
            >
              <Text style={styles.btnOutlineText}>¿Necesitas cancelar una cita?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── PASO 1: Fecha y Hora ── */}
        {step === 1 && (
          <View>
            <Text style={styles.sectionTitle}>Elige fecha</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {dias.map(d => (
                <TouchableOpacity
                  key={d.date}
                  style={[styles.dateChip, fecha === d.date && styles.dateChipSelected]}
                  onPress={() => { setFecha(d.date); setHora(null) }}
                >
                  <Text style={styles.dateDay}>{d.label}</Text>
                  <Text style={styles.dateNum}>{d.num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {fecha && (
              <View>
                <Text style={styles.sectionTitle}>Horarios disponibles</Text>

                {/* Día completamente bloqueado */}
                {diaBloqueado && !loadingSlots && (
                  <View style={styles.diaBloqueadoBox}>
                    <Text style={styles.diaBloqueadoIcon}>🔒</Text>
                    <Text style={styles.diaBloqueadoText}>
                      Este día no está disponible.{'\n'}Por favor elige otra fecha.
                    </Text>
                  </View>
                )}

                {loadingSlots
                  ? <ActivityIndicator color={GOLD} />
                  : !diaBloqueado && (
                    <>
                      {/* Leyenda */}
                      <View style={styles.leyenda}>
                        <View style={styles.leyendaItem}>
                          <View style={[styles.leyendaDot, { backgroundColor: GOLD }]} />
                          <Text style={styles.leyendaText}>Disponible</Text>
                        </View>
                        <View style={styles.leyendaItem}>
                          <View style={[styles.leyendaDot, { backgroundColor: '#444' }]} />
                          <Text style={styles.leyendaText}>Ocupado</Text>
                        </View>
                        <View style={styles.leyendaItem}>
                          <View style={[styles.leyendaDot, { backgroundColor: RED + '88' }]} />
                          <Text style={styles.leyendaText}>Bloqueado</Text>
                        </View>
                      </View>

                      <View style={styles.slotsGrid}>
                        {slots.map(s => {
                          const taken = takenSlots.includes(s)
                          const blocked = blockedSlots.includes(s)
                          const unavailable = taken || blocked

                          return (
                            <TouchableOpacity
                              key={s}
                              style={[
                                styles.slotBtn,
                                hora === s && styles.slotBtnSelected,
                                taken && styles.slotBtnTaken,
                                blocked && styles.slotBtnBlocked,
                              ]}
                              onPress={() => !unavailable && setHora(s)}
                              disabled={unavailable}
                            >
                              <Text style={[
                                styles.slotText,
                                hora === s && { color: GOLD },
                                taken && styles.slotTextTaken,
                                blocked && styles.slotTextBlocked,
                              ]}>
                                {s}
                              </Text>
                              {taken && <Text style={styles.slotLabel}>ocupado</Text>}
                              {blocked && <Text style={[styles.slotLabel, { color: RED + 'aa' }]}>bloqueado</Text>}
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </>
                  )
                }
              </View>
            )}

            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(0)}>
                <Text style={styles.btnOutlineText}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnGold, { flex: 1, marginLeft: 10 }, !hora && styles.btnDisabled]}
                onPress={() => setStep(2)} disabled={!hora}
              >
                <Text style={styles.btnGoldText}>Siguiente →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PASO 2: Datos ── */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionTitle}>Tus datos</Text>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NOMBRE COMPLETO *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej: Juan García"
                placeholderTextColor={MUTED}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>WHATSAPP / TELÉFONO</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej: 3001234567"
                placeholderTextColor={MUTED}
                keyboardType="phone-pad"
                value={contacto}
                onChangeText={setContacto}
              />
            </View>
            <View style={styles.navBtns}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setStep(1)}>
                <Text style={styles.btnOutlineText}>← Atrás</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnGold, { flex: 1, marginLeft: 10 }, !nombre.trim() && styles.btnDisabled]}
                onPress={() => setStep(3)} disabled={!nombre.trim()}
              >
                <Text style={styles.btnGoldText}>Siguiente →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── PASO 3: Confirmar ── */}
        {step === 3 && (
          <View>
            <Text style={styles.sectionTitle}>Confirmar cita</Text>
            <View style={styles.summaryCard}>
              {[
                ['Barbero', barbero?.nombre],
                ['Fecha', fecha ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : ''],
                ['Hora', hora + ' hrs'],
                ['Cliente', nombre],
                ...(contacto ? [['Contacto', contacto]] : []),
              ].map(([label, val], i, arr) => (
                <View key={label} style={[styles.summaryRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.summaryLabel}>{label}</Text>
                  <Text style={styles.summaryVal}>{val}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btnGold, loading && styles.btnDisabled]}
              onPress={confirmar} disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#111" />
                : <Text style={styles.btnGoldText}>✓ Confirmar Reserva</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnOutline, { marginTop: 10 }]} onPress={() => setStep(2)}>
              <Text style={styles.btnOutlineText}>← Editar</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal cancelar cita */}
      <CancelarCitaModal visible={modalCancelar} onClose={() => setModalCancelar(false)} />
    </SafeAreaView>
  )
}

// ─── Estilos ─────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DARK },
  hero: { backgroundColor: '#1a1200', borderBottomWidth: 1, borderBottomColor: BORDER, padding: 24, alignItems: 'center' },
  heroTitle: { fontSize: 32, letterSpacing: 4, color: GOLD, fontWeight: '700' },
  heroSub: { fontSize: 11, color: MUTED, marginTop: 4, letterSpacing: 2 },
  tabs: { flexDirection: 'row', backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 9, color: MUTED, letterSpacing: 0.5 },
  tabTextActive: { color: GOLD },
  tabLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: GOLD },
  sectionTitle: { fontSize: 20, letterSpacing: 2, color: GOLD, fontWeight: '700', marginBottom: 16 },

  barberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  barberCard: { width: '47%', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, alignItems: 'center' },
  barberCardSelected: { borderColor: GOLD, backgroundColor: '#1a1500' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#2a2200', borderWidth: 2, borderColor: GOLD, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  avatarText: { fontSize: 18, color: GOLD, fontWeight: '700' },
  barberName: { fontSize: 14, color: WHITE, fontWeight: '500', textAlign: 'center' },
  barberSpec: { fontSize: 11, color: MUTED, marginTop: 2, textAlign: 'center' },

  dateChip: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 10, marginRight: 8, alignItems: 'center', minWidth: 52 },
  dateChipSelected: { borderColor: GOLD, backgroundColor: '#1a1500' },
  dateDay: { fontSize: 10, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  dateNum: { fontSize: 22, color: WHITE, fontWeight: '700', lineHeight: 26 },

  diaBloqueadoBox: { alignItems: 'center', backgroundColor: '#1a0000', borderWidth: 1, borderColor: RED + '55', borderRadius: 12, padding: 24, marginTop: 8 },
  diaBloqueadoIcon: { fontSize: 32, marginBottom: 10 },
  diaBloqueadoText: { color: RED, textAlign: 'center', fontSize: 14, lineHeight: 22 },

  leyenda: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaDot: { width: 8, height: 8, borderRadius: 4 },
  leyendaText: { fontSize: 10, color: MUTED },

  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { width: '22%', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 8, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  slotBtnSelected: { borderColor: GOLD, backgroundColor: '#1a1500' },
  slotBtnTaken: { backgroundColor: '#181818', borderColor: '#2a2a2a' },
  slotBtnBlocked: { backgroundColor: '#1a0000', borderColor: RED + '44' },
  slotText: { fontSize: 12, color: WHITE },
  slotTextTaken: { color: '#444', textDecorationLine: 'line-through' },
  slotTextBlocked: { color: RED + 'aa', textDecorationLine: 'line-through' },
  slotLabel: { fontSize: 8, color: '#444', marginTop: 2 },

  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 11, color: MUTED, letterSpacing: 1, marginBottom: 6 },
  formInput: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, color: WHITE, fontSize: 14 },

  summaryCard: { backgroundColor: CARD, borderWidth: 1, borderColor: GOLD, borderRadius: 12, padding: 16, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  summaryLabel: { fontSize: 14, color: MUTED },
  summaryVal: { fontSize: 14, color: WHITE, fontWeight: '500', textTransform: 'capitalize', flex: 1, textAlign: 'right' },

  btnGold: { backgroundColor: GOLD, borderRadius: 10, padding: 16, alignItems: 'center' },
  btnGoldText: { color: '#111', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  btnDisabled: { opacity: 0.4 },
  btnOutline: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnOutlineText: { color: MUTED, fontSize: 13 },
  navBtns: { flexDirection: 'row', marginTop: 24 },

  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a2e1a', borderWidth: 2, borderColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontSize: 28, letterSpacing: 3, color: GOLD, fontWeight: '700' },
  successSub: { fontSize: 14, color: MUTED, marginTop: 6 },
})

const mstyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  box: { backgroundColor: SURFACE, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, borderTopWidth: 1, borderColor: BORDER },
  title: { fontSize: 14, color: GOLD, letterSpacing: 2, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  hint: { fontSize: 12, color: MUTED, textAlign: 'center', marginBottom: 20 },
  label: { fontSize: 10, color: MUTED, letterSpacing: 1.5, marginBottom: 6 },
  input: { backgroundColor: DARK, borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, color: WHITE, fontSize: 14, marginBottom: 14 },
  btnBuscar: { backgroundColor: GOLD, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  btnBuscarText: { color: '#111', fontSize: 14, fontWeight: '700' },
  emptyBox: { padding: 20 },
  citaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 12, marginBottom: 8 },
  citaNombre: { fontSize: 14, color: WHITE, fontWeight: '500', marginBottom: 4 },
  citaMeta: { fontSize: 11, color: MUTED, marginBottom: 2 },
  btnCancelar: { borderWidth: 1, borderColor: RED, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  btnCancelarText: { color: RED, fontSize: 12, fontWeight: '500' },
  btnCerrar: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnCerrarText: { color: MUTED, fontSize: 14 },
})// Multi-step booking flow
