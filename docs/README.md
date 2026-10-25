# 3Monks - Fruit Shots & Creamy Blends

A full-stack web application for managing a fresh fruit shots and creamy blends business with multi-shop support, role-based access control, and real-time analytics.

## 🏗 Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React SPA  │────▶│  Spring Boot │────▶│  PostgreSQL  │
│   (Port 80)  │     │  (Port 8080) │     │  (Port 5432) │
│              │     │              │     │              │
│  - React 18  │     │  - Java 17   │     │  - JPA/DDL   │
│  - Router v6 │     │  - JWT Auth  │     │  - Auto-gen  │
│  - Chart.js  │     │  - Swagger   │     │              │
│  - Axios     │     │  - RBAC      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                    Docker Compose
```

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- Default login: `admin` / `admin123`

### Manual Development Setup

**Backend:**
```bash
cd backend
# Ensure PostgreSQL is running on localhost:5432 with database 'threemonks'
mvn spring-boot:run
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

## 👥 Role-Based Access Control

| Feature | Super Admin | Shop Manager | Shop Operator |
|---------|:-----------:|:------------:|:-------------:|
| View All Shops | ✅ | ❌ | ❌ |
| Manage Shops | ✅ | ❌ | ❌ |
| Manage Users | ✅ | Own Shop | ❌ |
| Manage Products/Menu | ✅ | ❌ | ❌ |
| Manage Fruits | ✅ | ❌ | ❌ |
| Manage Raw Materials | ✅ | ❌ | ❌ |
| View Stock | ✅ | Own Shop | ❌ |
| Manage Purchases | ✅ | Own Shop | ❌ |
| Create Orders | ✅ | Own Shop | Own Shop |
| View Orders | ✅ (All) | Own Shop | Own Shop |
| Dashboard Analytics | ✅ (Global) | Own Shop | ❌ |
| P&L Reports | ✅ (All) | Own Shop | ❌ |

## 📊 Database Schema

### Core Entities

- **Shop** - Multi-shop support (name, address, phone, GST)
- **User** - Auth users with role & shop assignment
- **Fruit** - Fruit master (name, description, active)
- **Product** - Menu items (SHOT/BLEND, price, linked fruits)
- **RawMaterial** - Input materials (unit type, cost per unit)
- **Stock** - Current inventory per shop per material
- **StockHistory** - Audit trail for stock changes
- **Purchase** - Purchase records with vendor info
- **Order** - Customer orders with auto-generated order numbers
- **OrderItem** - Line items per order

### Key Relationships

```
Shop 1──N User
Shop 1──N Stock
Shop 1──N Order
Shop 1──N Purchase
Product N──M Fruit (via product_fruits join table)
Product 1──N OrderItem
Order 1──N OrderItem
RawMaterial 1──N Stock
RawMaterial 1──N Purchase
```

## 🔌 API Endpoints

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/public/menu` | Full menu |
| GET | `/api/public/menu/shots` | Shots only |
| GET | `/api/public/menu/blends` | Blends only |
| GET | `/api/public/fruits` | Available fruits |
| GET | `/api/public/shops` | Active shops |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |

### Admin Only (SUPER_ADMIN)
| Method | Endpoint | Description |
|--------|----------|-------------|
| CRUD | `/api/admin/shops/**` | Shop management |
| CRUD | `/api/admin/users/**` | User management |
| CRUD | `/api/admin/products/**` | Product management |
| CRUD | `/api/admin/fruits/**` | Fruit management |
| CRUD | `/api/admin/raw-materials/**` | Raw material management |

### Manager (SUPER_ADMIN, SHOP_MANAGER)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/manager/shops/{id}/stock` | Stock management |
| GET/POST | `/api/manager/shops/{id}/purchases` | Purchase management |
| GET | `/api/manager/shops/{id}/users` | Shop users |

### Orders (All Authenticated)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create order |
| GET | `/api/orders/shop/{id}` | Shop orders |
| GET | `/api/orders/shop/{id}/today` | Today's orders |
| PUT | `/api/orders/{id}/cancel` | Cancel order |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/admin` | Global dashboard |
| GET | `/api/dashboard/shop/{id}` | Shop dashboard |
| GET | `/api/dashboard/profit-loss` | P&L report |

## 🖨 Receipt / Thermal Printer

The Receipt component renders a print-friendly layout optimized for 80mm/58mm thermal printers.

**Usage:**
1. Complete an order
2. Click "Print Receipt" button
3. A print dialog opens with receipt-formatted layout
4. For ESC/POS printers, configure the browser's default printer

**Receipt includes:** Shop name, GST number, order number, date/time, itemized list, totals, payment mode.

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.2.3, Spring Security |
| Auth | JWT (jjwt 0.12.5) |
| Database | PostgreSQL 15, JPA/Hibernate |
| API Docs | Swagger / OpenAPI (springdoc 2.3.0) |
| Frontend | React 18, React Router v6 |
| Charts | Chart.js + react-chartjs-2 |
| HTTP | Axios with JWT interceptor |
| Styling | Custom CSS (mobile-first) |
| Export | Apache POI (Excel), iText7 (PDF) |
| Container | Docker + Docker Compose |
| Proxy | Nginx |

## 📁 Project Structure

```
3Monks/
├── backend/
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/main/java/com/threemonks/
│       ├── ThreeMonksApplication.java
│       ├── config/          # SecurityConfig, DataInitializer
│       ├── controller/      # Auth, Public, Admin, Manager, Order, Dashboard
│       ├── dto/             # Request/Response DTOs
│       ├── entity/          # JPA entities
│       ├── enums/           # Role, PaymentMode, etc.
│       ├── exception/       # Global error handling
│       ├── repository/      # JPA repositories
│       ├── security/        # JWT, UserPrincipal, filters
│       └── service/         # Business logic
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── src/
│       ├── App.js           # Router & route definitions
│       ├── index.js          # Entry point
│       ├── index.css         # Global styles
│       ├── components/       # Sidebar, Modal, Receipt, etc.
│       ├── context/          # AuthContext
│       ├── pages/            # All page components
│       ├── services/         # API client & data services
│       └── utils/            # Helpers
├── docs/                     # Documentation
├── docker-compose.yml
└── .gitignore
```

## 🔒 Security

- JWT tokens with 24h expiration
- Role + shopId embedded in token claims
- All API data filtered by user's role and shop assignment
- Password hashing with BCrypt
- CORS configured for allowed origins
- Stateless session management
- Auto-created default admin on first startup
