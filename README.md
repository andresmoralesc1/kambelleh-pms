# 🏨 Kambelleh PMS

**Sistema de Gestión de Propiedades Hoteleras** — alternativa open-source a Lobby PMS y similar.

> Built for boutique hotels, hostels, B&Bs y alquileres temporales en Latinoamérica.

---

## ✨ Funcionalidades

| Módulo | Descripción |
|---|---|
| **Dashboard** | Stats en tiempo real: ocupación, ingresos del mes, llegadas/salidas de hoy |
| **Reservas** | Wizard de 3 pasos para crear reservas, gestión completa con filtros por estado |
| **Habitaciones** | CRUD de habitaciones con tipos (PRIVATE/SHARED/DORM), amenities, precio por noche |
| **Huéspedes** | Base de datos de huéspedes con documento, nacionalidad, historial de reservas |
| **Calendario** | Vista mensual con barras de reservas por día, leyenda de colores |
| **Analíticas** | Gráficos de ingresos mensuales, ADR, lead time, reservas por estado |
| **Housekeeping** | Estado de limpieza por habitación (Limpia/Necesita limpieza/En limpieza/Mantenimiento) con historial |
| **Notas internas** | Notas visibles solo para staff asociadas a huéspedes y reservas |
| **Canales OTA** | Integración con Airbnb (más canales en desarrollo) con sync de reservas |
| **Exportar CSV** | Descargar reservas, huéspedes y habitaciones en spreadsheets |
| **Configuración** | Horarios de check-in/out, política de cancelación, servicios incluidos, moneda |
| **Dark mode** | Toggle claro/oscuro con persistencia en localStorage |

---

## 🛠️ Stack tecnológico

```
Frontend   React 18 + Vite + Tailwind CSS 3.4
           React Query + React Router DOM v6
           Recharts (gráficos) · date-fns · lucide-react

Backend    Node.js + Express
           Prisma ORM + PostgreSQL
           JWT + bcrypt · Stripe · Resend (emails)

Infra      Docker + nginx (reverse proxy + SSL ready)
           Rate limiting · Helmet security headers
```

---

## 🚀 Deploy rápido (Docker)

```bash
# 1. Clonar y entrar al proyecto
git clone https://github.com/andresmoralesc1/kambelleh-pms.git
cd kambelleh-pms

# 2. Configurar variables
cp .env.example .env
# Editar .env con tus credenciales

# 3. Deploy
docker-compose up -d

# 4. Migrar DB y seed
docker exec kambelleh-pms-backend-1 npx prisma migrate deploy
docker exec kambelleh-pms-backend-1 node prisma/seed.js

# 5. Abrir en navegador
open http://localhost:3000
```

**Login por defecto:** `admin@kambelleh.com` / `admin123`

---

## ⚙️ Configuración sin Docker (desarrollo local)

### Requisitos
- Node.js 18+
- PostgreSQL 14+

```bash
# Backend
cd backend
cp ../.env.example .env  # ajustar DATABASE_URL
npm install
npx prisma migrate dev
node seed.js
npm run dev

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

Abrir `http://localhost:5173` — el proxy de Vite redirige `/api` al backend en `:3001`.

---

## 📁 Estructura del proyecto

```
kambelleh-pms/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Modelos: User, Room, Guest, Reservation, Payment...
│   │   ├── seed.js           # Datos de prueba
│   │   └── seedSettings.js   # Configuración inicial de la propiedad
│   └── src/
│       ├── routes/           # API endpoints por recurso
│       │   ├── auth.js       # Login, logout, refresh tokens
│       │   ├── rooms.js       # CRUD habitaciones + cleaning status
│       │   ├── reservations.js
│       │   ├── guests.js
│       │   ├── payments.js
│       │   ├── dashboard.js  # Stats y calendar data
│       │   ├── cleaning.js   # Housekeeping
│       │   ├── internalNotes.js
│       │   ├── exports.js    # CSV download
│       │   ├── settings.js
│       │   ├── channelManager.js  # Airbnb OTA
│       │   └── stripeWebhook.js
│       ├── middleware/
│       │   ├── auth.js        # JWT verification
│       │   └── errorHandler.js
│       ├── services/
│       │   └── airbnbService.js  # Airbnb API integration
│       └── index.js           # Express app + middleware
├── frontend/
│   └── src/
│       ├── api/index.js       # Axios client + todas las llamadas
│       ├── hooks/
│       │   ├── useQueries.js  # React Query hooks (useRooms, useReservations...)
│       │   └── useExport.js  # CSV download hook
│       ├── pages/             # Una page por módulo
│       ├── components/
│       │   ├── Layout.jsx     # Sidebar + mobile header
│       │   ├── ToastProvider.jsx
│       │   └── ConfirmDialog.jsx
│       └── context/
│           ├── AuthContext.jsx   # JWT + logout
│           └── ThemeContext.jsx  # Dark mode
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
└── setup.sh                  # Script de deploy automático
```

---

## 🔑 Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@10.0.3.2:5432/kambelleh` |
| `JWT_SECRET` | Secret para firmar JWTs | — |
| `FRONTEND_URL` | Origen permitido para CORS | `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | Clave de Stripe (lado servidor) | — |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | — |
| `RESEND_API_KEY` | Email transaccional | — |
| `AIRBNB_CLIENT_ID` | Airbnb Partner API (opcional) | — |
| `AIRBNB_CLIENT_SECRET` | Airbnb Partner API (opcional) | — |
| `AIRBNB_MOCK` | Modo demo sin credenciales Airbnb | `true` |

---

## 🌐 Endpoints API principales

```
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GET    /api/rooms
POST   /api/rooms
PATCH  /api/rooms/:id
DELETE /api/rooms/:id
GET    /api/rooms/:id/cleaning-logs
PATCH  /api/rooms/:id/cleaning-status

GET    /api/reservations
POST   /api/reservations
PATCH  /api/reservations/:id/status
DELETE /api/reservations/:id

GET    /api/guests
POST   /api/guests
PATCH  /api/guests/:id
DELETE /api/guests/:id

GET    /api/dashboard/stats
GET    /api/dashboard/calendar?month=2026-05
GET    /api/dashboard/analytics?months=6

GET    /api/cleaning/rooms
POST   /api/cleaning/rooms/:id/cleaning-logs

GET    /api/notes?guestId=X
GET    /api/notes?reservationId=X
POST   /api/notes
DELETE /api/notes/:id

GET    /api/exports/reservations
GET    /api/exports/guests
GET    /api/exports/rooms

GET    /api/settings
PUT    /api/settings

GET    /api/channels/airbnb/status
POST   /api/channels/airbnb/connect
POST   /api/channels/airbnb/disconnect
POST   /api/channels/airbnb/sync
```

---

## 📊 Modelo de datos

```
User (staff)
  └── RefreshToken

Room
  ├── Reservation
  │   ├── Payment
  │   └── InternalNote
  ├── Guest
  │   └── InternalNote
  ├── BlockedDate
  └── CleaningLog

ChannelConnection (Airbnb / Booking / Expedia)
Setting (key-value property config)
```

---

## 🔒 Seguridad

- **JWT con refresh tokens** — Access token corto (15min), refresh token en httpOnly cookie
- **Rate limiting** — 100 requests/15min por IP en todos los endpoints `/api`
- **Helmet** — Headers de seguridad (XSS, clickjacking, sniffing)
- **CORS** — Solo `FRONTEND_URL` puede hacer requests
- **Password hashing** — bcryptjs con salt rounds 12
- **SQL injection** — Prisma ORM con query building (no raw strings)
- **Stripe webhook** — Signature verification con `stripe-webhook-secret`

---

## 🎯 Roadmap

- [ ] Integración Booking.com y Expedia
- [ ] Portal de check-in para huéspedes
- [ ] Staff scheduling y turnos
- [ ] Inventario de productos de limpieza
- [ ] Notificaciones push in-app
- [ ] Smart lock integration (Tuya/Otel)
- [ ] Multi-propiedad (varias ubicaciones)
- [ ] App móvil (React Native)

---

## 📄 Licencia

MIT — usalo, modificalo, vendelo. Si te sirve, dejá una ⭐.

---

## 👤 Autor

Andrés Morales — [@andresmoralesc1](https://github.com/andresmoralesc1)

¿Preguntas o issues? [Abrí un ticket](https://github.com/andresmoralesc1/kambelleh-pms/issues).