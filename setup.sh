#!/bin/bash
# =============================================
# Kambelleh PMS - Script de Setup/Deploy
# =============================================

set -e

echo "🚀 Kambelleh PMS - Setup"

# 1. Crear archivo .env si no existe
if [ ! -f .env ]; then
  echo "⚠️  No se encontró .env — creando desde .env.example"
  cp .env.example .env
  echo "✅ Editá .env con tus credenciales reales antes de continuar"
  exit 1
fi

# 2. Verificar Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker no está instalado"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ docker-compose no está instalado"
  exit 1
fi

# 3. Build y start
echo "🔨 Construyendo contenedores..."
docker-compose build

echo "▶️  Iniciando servicios..."
docker-compose up -d

# 4. Esperar a postgres
echo "⏳ Esperando PostgreSQL..."
sleep 5

# 5. Migraciones y seed
echo "🗄️  Ejecutando migraciones..."
docker-compose exec -T backend npx prisma migrate deploy

echo "🌱 Ejecutando seed..."
docker-compose exec -T backend node seed.js

echo ""
echo "✅ Kambelleh PMS está corriendo!"
echo "   Admin: http://localhost (login con admin@kambelleh.com / admin123)"
echo ""
echo "📌 Para ver logs: docker-compose logs -f"
echo "📌 Para parar:     docker-compose down"
echo "📌 Para reiniciar: docker-compose restart"