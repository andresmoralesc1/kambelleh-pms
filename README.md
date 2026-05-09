# Kambelleh PMS

Sistema de gestión de reservas para hostal. Construido con React + Tailwind (frontend) y Node.js + Express + Prisma (backend).

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + React Query + React Router
- **Backend**: Node.js + Express + Prisma (PostgreSQL) + JWT
- **Pagos**: Stripe (PaymentIntents)
- **Deploy**: Docker en VPS

## Empezar

### Requisitos

- Node.js 20+
- PostgreSQL 16+
- Stripe account (modo test)

### Backend

```bash
cd backend
cp .env.example .env
# editar .env con tus valores

npm install
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# editar .env (VITE_API_URL y VITE_STRIPE_PUBLISHABLE_KEY)

npm install
npm run dev
```

Abre http://localhost:5173

## Primeros pasos

1. Ve a `/login`
2. Crea tu cuenta de admin con `POST /api/auth/register` (primera cuenta se crea como ADMIN automáticamente)
3. Añade habitaciones desde la sección **Habitaciones**
4. Crea huéspedes y reservas desde sus secciones

## Docker (producción)

```bash
# En el VPS
docker-compose up -d
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Registro |
| GET | /api/auth/me | Usuario actual |
| GET | /api/rooms | Listar habitaciones |
| POST | /api/rooms | Crear habitación |
| GET | /api/reservations | Listar reservas |
| POST | /api/reservations | Crear reserva |
| PATCH | /api/reservations/:id/status | Cambiar estado (check-in, etc.) |
| GET | /api/guests | Listar huéspedes |
| POST | /api/guests | Crear huésped |
| GET | /api/dashboard/stats | Métricas del dashboard |
| POST | /api/payments/create-intent | Crear PaymentIntent de Stripe |
| POST | /api/payments/webhook | Webhook de Stripe |

## Variables de entorno

**Backend** (`backend/.env`):
- `DATABASE_URL` — conexión PostgreSQL
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL` — URL del frontend (para CORS)
- `PORT` — puerto del servidor (default 3001)

**Frontend** (`frontend/.env`):
- `VITE_API_URL` — URL del backend API
- `VITE_STRIPE_PUBLISHABLE_KEY` — clave pública de Stripe

## Estructura del proyecto

```
kambelleh-pms/
├── backend/
│   ├── prisma/schema.prisma   # Modelos de base de datos
│   ├── src/
│   │   ├── routes/           # Endpoints API
│   │   ├── middleware/        # Auth, errores
│   │   └── config/           # DB, etc.
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/            # Vistas
│   │   ├── components/       # Componentes reutilizables
│   │   ├── hooks/            # React Query hooks
│   │   ├── api/              # Llamadas API
│   │   └── context/          # Auth context
│   └── package.json
├── docker-compose.yml
└── README.md
```