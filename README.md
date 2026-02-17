# Restaurant Bot Backend

WhatsApp-based restaurant ordering system with multi-restaurant support.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Validation**: Zod
- **API**: WhatsApp Cloud API
- **Deployment**: Docker

## Project Structure

```
backend/
├── src/
│   ├── config/          # Environment & database config
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, error handling, validation
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript types & DTOs
│   └── index.ts         # App entry point
├── prisma/
│   └── schema.prisma    # Database schema
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker services configuration
└── package.json
```

## 🐳 Docker Setup (Recommended)

### Prerequisites

- Docker and Docker Compose installed

### Quick Start

1. **Clone and navigate to backend**

```bash
cd restaurant_bot/backend
```

2. **Configure environment variables**

```bash
cp .env.docker .env
# Edit .env with your WhatsApp API credentials
```

3. **Start all services** (PostgreSQL + Backend)

```bash
docker-compose up -d
```

This will:

- Start PostgreSQL on port 5432
- Run database migrations automatically
- Start backend API on port 3000
- Set up hot reload for development

4. **View logs**

```bash
docker-compose logs -f backend
```

5. **Stop services**

```bash
docker-compose down
```

6. **Reset database** (caution: deletes all data)

```bash
docker-compose down -v
docker-compose up -d
```

### Docker Commands

```bash
# Rebuild after code changes
docker-compose up -d --build

# Run Prisma commands
docker-compose exec backend npx prisma studio
docker-compose exec backend npx prisma db push
docker-compose exec backend npx prisma migrate dev

# Access database directly
docker-compose exec postgres psql -U restaurant_user -d restaurant_bot
```

---

## 💻 Local Setup (Without Docker)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 3. Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema to database (dev)
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## Database Models

- **Restaurant** - Multi-tenant restaurant data
- **User** - Restaurant admin/staff
- **Customer** - WhatsApp users
- **MenuCategory** - Food categories
- **MenuItem** - Individual menu items
- **Order** - Customer orders
- **OrderItem** - Order line items
- **Conversation** - WhatsApp conversation state

## API Endpoints (Coming Soon)

### Authentication

- `POST /api/auth/login` - Admin login

### Categories

- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category

### Menu Items

- `GET /api/menu-items` - List menu items
- `POST /api/menu-items` - Create menu item
- `PATCH /api/menu-items/:id` - Update menu item

### Orders

- `GET /api/orders` - List orders
- `PATCH /api/orders/:id/status` - Update order status

### Webhook

- `GET /webhook/whatsapp` - Webhook verification
- `POST /webhook/whatsapp` - Receive WhatsApp messages

## Architecture

### Layered Design

1. **Controllers** - Handle HTTP requests/responses
2. **Services** - Contain business logic
3. **Repositories** - Database operations
4. **Middleware** - Authentication, validation, error handling

### Conversation Flow

```
WELCOME
  ↓
SELECT_CATEGORY
  ↓
SELECT_ITEM
  ↓
SELECT_QUANTITY
  ↓
ADD_MORE (Yes → back to SELECT_CATEGORY, No → next)
  ↓
CONFIRM_ORDER
  ↓
PAYMENT_INSTRUCTIONS
  ↓
PAYMENT_CONFIRMATION
```

## MoMo Payment Flow

1. Customer confirms order
2. Bot sends payment instructions with MoMo number
3. Customer sends payment and replies "PAID"
4. Order status → `PENDING_VERIFICATION`
5. Restaurant admin receives notification
6. Admin verifies and updates order

## Next Steps

Phase 2 will implement:

- WhatsApp webhook controller
- Conversation engine
- Order service
- MoMo payment flow
- REST APIs for dashboard
# restaurant-chat-bot
