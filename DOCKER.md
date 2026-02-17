# Docker Setup Guide

## What Was Created

1. **Dockerfile** - Multi-stage build for optimized production image
2. **docker-compose.yml** - Orchestrates PostgreSQL + Backend
3. **.dockerignore** - Excludes unnecessary files from Docker image
4. **.env.docker** - Environment variables template for Docker

## Services

### PostgreSQL Database

- **Image**: postgres:16-alpine
- **Port**: 5432
- **Credentials**:
  - User: `restaurant_user`
  - Password: `restaurant_password`
  - Database: `restaurant_bot`
- **Volume**: Persistent data storage
- **Health Check**: Ensures DB is ready before backend starts

### Backend API

- **Build**: From local Dockerfile
- **Port**: 3000
- **Auto-migration**: Runs `prisma db push` on startup
- **Hot Reload**: Source code mounted for development
- **Environment**: All config via environment variables

## Quick Start

```bash
# 1. Navigate to backend folder
cd restaurant_bot/backend

# 2. Copy environment template
cp .env.docker .env

# 3. Edit .env with your WhatsApp API credentials (optional for initial setup)
nano .env

# 4. Start everything
docker-compose up -d

# 5. Check logs
docker-compose logs -f

# 6. API is now running at http://localhost:3000
```

## Common Commands

### Start/Stop

```bash
docker-compose up -d          # Start in background
docker-compose down           # Stop all services
docker-compose restart        # Restart all services
```

### Logs

```bash
docker-compose logs -f         # Follow all logs
docker-compose logs -f backend # Backend only
docker-compose logs -f postgres # Database only
```

### Database

```bash
# Reset database (CAUTION: deletes all data)
docker-compose down -v
docker-compose up -d

# Access Prisma Studio
docker-compose exec backend npx prisma studio

# Run migrations
docker-compose exec backend npx prisma migrate dev --name init

# Access PostgreSQL directly
docker-compose exec postgres psql -U restaurant_user -d restaurant_bot
```

### Development

```bash
# Rebuild after Dockerfile changes
docker-compose up -d --build

# View running containers
docker-compose ps

# Access backend shell
docker-compose exec backend sh
```

## Environment Variables

Edit `.env` file to configure:

```env
# Required for WhatsApp functionality
WHATSAPP_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id

# JWT Security
JWT_SECRET=change_this_in_production

# Admin Credentials
ADMIN_EMAIL=admin@restaurant.com
ADMIN_PASSWORD=changeme123
```

## Ports

- **3000**: Backend API
- **5432**: PostgreSQL Database

Make sure these ports are available before starting Docker.

## Troubleshooting

### Port already in use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
ports:
  - '3001:3000'  # Maps host 3001 to container 3000
```

### Database connection failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Prisma Client not generated

```bash
# Regenerate Prisma Client
docker-compose exec backend npx prisma generate

# Restart backend
docker-compose restart backend
```

## Production Deployment

For production, update docker-compose.yml:

1. Remove volume mounts (src folder)
2. Change `NODE_ENV` to `production`
3. Use `command: npm start` instead of `npm run dev`
4. Set strong `JWT_SECRET` and `ADMIN_PASSWORD`
5. Use environment-specific `.env` file

Ready to develop! 🚀
