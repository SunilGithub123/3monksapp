# 3Monks - Fruit Shots & Creamy Blends

> 100% Real Fruit. No Artificial Flavor.

Full-stack web application for managing a fruit shots and creamy blends business.

## Quick Start


```bash
docker-compose up --build
```

- **Website:** http://localhost
- **API:** http://localhost:8080
- **Swagger:** http://localhost:8080/swagger-ui.html
- **Login:** `admin` / `admin123`

## Features

- 🍊 Public landing page with menu
- 🔐 JWT authentication with 3-tier RBAC
- 📊 Real-time dashboards with Chart.js
- 🛒 POS-style order management
- 📦 Inventory & stock tracking
- 🧾 Purchase management with auto-stock
- 📈 Profit & Loss reports
- 🖨️ Thermal printer receipt support
- 🏪 Multi-shop architecture
- 🐳 Docker deployment
- 🧩 Quick Order grid: 3-column layout (fruit panel, cart, queue) with seamless queue placement on the right side

## Documentation

See [docs/](docs/) for detailed documentation:
- [Architecture & Setup](docs/README.md)
- [API Design](docs/API_DESIGN.md)
- [RBAC Plan](docs/RBAC_PLAN.md)
- [Receipt Printer Guide](docs/RECEIPT_PRINTER_GUIDE.md)
