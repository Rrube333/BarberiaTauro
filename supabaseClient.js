import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ─────────────────────────────────────────────────────────────
// CÓMO OBTENER ESTAS CREDENCIALES:
// 1. Ve a https://supabase.com → tu proyecto
// 2. Settings → API
// 3. Copia "Project URL" y "anon public" key
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://secganoyyvlvtvtyvoxc.supabase.co'  // ← tu URL original
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlY2dhbm95eXZsdnR2dHl2b3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTI2NzYsImV4cCI6MjA5NDg4ODY3Nn0.LgSGXKqnuQb7H_aXwHgJQBM2bMVRyoOkBW9QYWt_WIc'  // ← la anon key de imagen 2

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})// Supabase client for barberiatt app
