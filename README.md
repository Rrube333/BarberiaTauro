Esneider Santiago Sanchez Rivero
Ruben Dario Tarazona Barranco


# Tauro Barbería App

Aplicación móvil desarrollada en **React Native con Expo y Supabase** que permite a los clientes reservar citas en línea y al administrador gestionar la barbería desde su celular.



## Descripción del proyecto

Tauro Barbería App es una app móvil creada para la barbería **Tauro**, ubicada en Bucaramanga, Santander. Su objetivo es eliminar las reservas por WhatsApp o llamada, permitiendo a los clientes elegir su barbero, fecha y hora disponible directamente desde la app. El administrador tiene un panel completo para gestionar citas, barberos y horarios en tiempo real.



## Instalación y configuración

### Requisitos previos
- Node.js v18 o superior
- npm o npx
- Expo Go instalado en tu celular (Android o iOS)
- Cuenta en [Supabase](https://supabase.com) (gratuita)

### Pasos para instalar

1. Clona o descarga el proyecto:
```bash
git clone <url-del-repositorio>
cd barberiatt
```

2. Instala las dependencias:
```bash
npm install
```

3. Instala las librerías adicionales:
```bash
npx expo install react-native-maps expo-image-picker
```

4. Configura tu proyecto en Supabase:
   - Ve a [supabase.com](https://supabase.com) y crea una cuenta
   - Crea un nuevo proyecto
   - Ve a **SQL Editor** y ejecuta el archivo `supabase_setup.sql` incluido en el proyecto
   - Ve a **Settings → API** y copia tu **Project URL** y **anon public key**
   - Abre `supabaseClient.js` y reemplaza:
```js
const SUPABASE_URL  = 'https://tu-proyecto.supabase.co'
const SUPABASE_ANON = 'tu-anon-key'
```

5. Agrega tu logo:
   - Coloca el archivo `logo.png` dentro de la carpeta `assets/`

6. Crea tu usuario administrador:
   - En Supabase ve a **Authentication → Users → Add user**
   - Ingresa tu email y contraseña de admin

7. Inicia el proyecto:
```bash
npx expo start
```

8. Escanea el código QR con la app **Expo Go** desde tu celular.

---

## Estructura del proyecto

```
barberiatt/
├── App.js                  # Punto de entrada, navegación y autenticación
├── app.json                # Configuración de Expo
├── package.json            # Dependencias del proyecto
├── supabaseClient.js       # Configuración y conexión a Supabase
├── supabase_setup.sql      # Script SQL para crear las tablas en Supabase
├── ReservaScreen.js        # Pantalla principal del cliente (reservar cita)
├── AdminScreen.js          # Panel de administración (citas y barberos)
├── LoginScreen.js          # Pantalla de login para el administrador
├── Mapatauro.js            # Ubiacion del mapa de la barberia
│
└── assets/
    ├── logo.png            # Logo de la barbería
    ├── icon.png            # Ícono de la app
    └── splash-icon.png     # Pantalla de carga
```

---

## Librerías utilizadas

| Librería | Versión | Para qué se usa |
|---|---|---|
| react-native | 0.81+ | Framework base de la app móvil |
| expo | 54+ | Herramienta para correr y compilar la app |
| @supabase/supabase-js | 2+ | Conexión a la base de datos y autenticación |
| @react-native-async-storage/async-storage | 2+ | Persistencia de sesión del administrador |
| expo-secure-store | 15+ | Almacenamiento seguro de credenciales |
| react-native-maps | — | Mapa interactivo con la ubicación de la barbería |
| expo-image-picker | — | Selección de fotos de perfil para los barberos |

---

## Base de datos (Supabase)

**Supabase** — Backend as a Service con PostgreSQL  
URL del proyecto: `https://tu-proyecto.supabase.co`

| Tabla | Descripción |
|---|---|
| `barberos` | Barberos registrados con nombre, especialidad, foto y estado activo |
| `citas` | Reservas de clientes con barbero, fecha, hora y estado |
| `bloqueos` | Días u horarios bloqueados por el administrador |

### Seguridad (Row Level Security)

| Tabla | Público (anon) | Admin (authenticated) |
|---|---|---|
| barberos | Solo ver activos | Ver todos, crear, editar, eliminar |
| citas | Ver y crear | Actualizar estado, eliminar |
| bloqueos | Ver | Crear y eliminar |

---

## Conceptos técnicos implementados

### useState y useEffect
Maneja todos los estados locales de la app: barbero seleccionado, fecha, hora, slots ocupados y bloqueados.

```js
const [barbero, setBarbero] = useState(null)
const [takenSlots, setTakenSlots] = useState([])
const [blockedSlots, setBlockedSlots] = useState([])

useEffect(() => {
  if (!barbero || !fecha) return
  // Carga slots ocupados y bloqueos al cambiar barbero o fecha
  Promise.all([
    supabase.from('citas').select('hora_inicio').eq('barbero_id', barbero.id).eq('fecha', fecha),
    supabase.from('bloqueos').select('*').eq('barbero_id', barbero.id).eq('fecha', fecha),
  ]).then(([citas, bloqueos]) => { /* actualiza estado */ })
}, [barbero, fecha])
```

### Supabase Auth
Gestiona la autenticación del administrador con persistencia de sesión usando AsyncStorage.

```js
supabase.auth.signInWithPassword({ email, password })
supabase.auth.signOut()
supabase.auth.onAuthStateChange((_event, session) => setSession(session))
```

### Supabase Storage
Permite subir y servir fotos de perfil de los barberos.

```js
await supabase.storage.from('barberos').upload(fileName, blob)
const { data } = supabase.storage.from('barberos').getPublicUrl(fileName)
```

### Row Level Security (RLS)
Protege los datos en Supabase según el tipo de usuario (anon o authenticated).

```sql
CREATE POLICY "citas_crear_publico"
  ON citas FOR INSERT WITH CHECK (true);

CREATE POLICY "citas_admin_actualizar"
  ON citas FOR UPDATE TO authenticated USING (true);
```

### Auto-limpieza con pg_cron
Elimina automáticamente citas completadas y canceladas con más de 3 meses de antigüedad.

```sql
SELECT cron.schedule(
  'limpiar_citas_antiguas',
  '0 3 1 */3 *',
  $$ DELETE FROM citas WHERE estado IN ('completada','cancelada')
     AND created_at < now() - INTERVAL '3 months'; $$
);
```

---

## Requerimientos funcionales implementados

### Pantalla del cliente
- [x] Selección de barbero con foto de perfil
- [x] Selección de fecha (próximos 14 días, sin domingos)
- [x] Visualización de horarios disponibles, ocupados y bloqueados
- [x] Formulario con nombre y teléfono del cliente
- [x] Resumen de cita antes de confirmar
- [x] Pantalla de éxito con mapa de ubicación
- [x] Cancelar cita buscando por nombre y teléfono

### Panel de administrador
- [x] Login seguro con email y contraseña
- [x] Dashboard con estadísticas (citas hoy, pendientes, total)
- [x] Filtro de citas por barbero y estado
- [x] Cambiar estado de cita (completar / cancelar)
- [x] Crear, editar y eliminar barberos
- [x] Subir foto de perfil a los barberos
- [x] Activar / desactivar barberos
- [x] Historial de citas por cliente
- [x] Bloquear días u horarios por barbero
- [x] Cerrar sesión con confirmación

## Requerimientos no funcionales implementados

- [x] Autenticación segura con Supabase Auth
- [x] Persistencia de sesión del administrador
- [x] Row Level Security en todas las tablas
- [x] Interfaz con tema oscuro y colores de marca
- [x] Mapa interactivo con la ubicación real de la barbería
- [x] Auto-limpieza de historial cada 3 meses
- [x] Código modular organizado por pantallas

## Extras implementados

- [x] Logo propio de la barbería en el header
- [x] Fotos de perfil reales para cada barbero (Supabase Storage)
- [x] Mapa con la ubicación exacta y botón para abrir Google Maps
- [x] Leyenda visual de slots (disponible / ocupado / bloqueado)
- [x] Slots bloqueados visibles pero con tachado en rojo
- [x] Badge de seleccionado en tarjeta de barbero
- [x] Pull-to-refresh en el panel de administrador
- [x] Citas del día resaltadas en dorado en el panel admin

---

## Ubicación de la barbería

**Tauro Barbería**  
📍 Cl. 10 #23-34, Bucaramanga, Santander 68001  
🗺️ [Ver en Google Maps](https://www.google.com/maps/search/?api=1&query=7.1197,-73.1227)

---

## Desarrollado con

- React Native + Expo
- Supabase (PostgreSQL + Auth + Storage)
- react-native-maps
- expo-image-picker
