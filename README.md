# Personal OS

Fase 1 del roadmap: arquitectura + Supabase + Auth + base de datos. Next.js
(App Router) + TypeScript + Tailwind + Supabase, continuando el diseño
visual de War Room (mismos colores, mismas tipografías: Fraunces, Public
Sans, IBM Plex Mono).

## Qué incluye esta fase

- Autenticación real (correo + contraseña) con Supabase Auth.
- Cada ruta de la app exige sesión iniciada (`proxy.ts` — el archivo que
  intercepta cada request antes de que llegue a una página; Next.js 16 le
  cambió el nombre a lo que antes se llamaba `middleware.ts`).
- Esquema completo de base de datos en `supabase/migrations/` — 25 tablas
  con Row Level Security: nadie puede leer ni escribir datos de otro
  usuario, ni siquiera con la anon key en la mano.
- Un dashboard mínimo que lee datos reales de Supabase (hoy en cero,
  porque las tablas existen pero aún no tienen filas).
- El sidebar ya muestra la navegación completa del sistema (Hoy, Inbox,
  Metas, Proyectos, Tareas, Hábitos, Conocimiento, Finanzas, Calendario,
  Revisiones, Insights); las secciones que aún no se construyen aparecen
  bloqueadas con la fase que las habilita, en vez de fingir que ya
  funcionan.

## 1. Crear el proyecto de Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto nuevo
   (elige una región cercana, ej. São Paulo).
2. Ve a **Project Settings → API** y copia la **Project URL** y la
   **anon public key**.
3. En este proyecto de código, copia `.env.local.example` a `.env.local`
   y pega esos dos valores.

## 2. Crear las tablas (correr las migraciones)

La forma más simple sin instalar nada: en el panel de Supabase, entra a
**SQL Editor** y ejecuta, en este orden, el contenido de cada archivo de
`supabase/migrations/`:

1. `0001_schema.sql` — crea las 25 tablas.
2. `0002_rls.sql` — activa Row Level Security y las políticas por usuario.
3. `0003_profile_trigger.sql` — crea el perfil automáticamente al
   registrarte, y mantiene `updated_at` al día.

(Si prefieres la CLI de Supabase: `supabase link` y luego
`supabase db push` corre los tres archivos en orden automáticamente.)

## 3. Confirmación de correo (opcional, recomendado desactivar para uso personal)

Por defecto Supabase exige confirmar el correo antes de poder iniciar
sesión. Para una cuenta de un solo usuario (la tuya), lo más simple es
desactivarlo: **Authentication → Providers → Email → "Confirm email"** →
apágalo. Si lo dejas activado, la app ya maneja el flujo ("revisa tu
correo") sin romperse.

## 4. Correr en local

```bash
npm install
npm run dev
```

Abre `http://localhost:3000` — te manda a `/login`, crea tu cuenta ahí.

## 5. Desplegar en Vercel

1. Sube esta carpeta a un repo de GitHub (o usa `npx vercel` directo
   desde aquí sin GitHub).
2. En Vercel, importa el repo (o confirma el deploy de `vercel`).
3. En **Settings → Environment Variables** del proyecto en Vercel, agrega
   las mismas dos variables de `.env.local`.
4. Deploy. Como ya usas Vercel para VANT, esto queda en la misma cuenta.

## Estructura

```
app/
  login/            página de inicio de sesión / registro
  auth/callback/    intercambio de código para confirmación de correo
  dashboard/        shell autenticado (sidebar + topbar) + página inicial
lib/supabase/       clientes de Supabase (browser, server, proxy)
components/         sidebar, topbar, header móvil
supabase/migrations/ esquema SQL + RLS + triggers
```

## Siguiente fase

Fase 2: CRUD real de Áreas y Metas (con jerarquía anual → trimestral →
mensual) y la primera versión de Proyectos conectados a esas metas.
