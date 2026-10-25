# 3Monks - RBAC Implementation Plan

## Overview

The 3Monks application implements a three-tier Role-Based Access Control (RBAC) system that governs access to all application features based on the authenticated user's role and shop assignment.

## Roles

### 1. SUPER_ADMIN
- **Scope:** Global (all shops)
- **Capabilities:**
  - Full CRUD on all entities (shops, users, products, fruits, raw materials)
  - View all orders, stock, and purchases across all shops
  - Access global dashboard with aggregated analytics
  - Generate P&L reports for any shop or all shops
  - Create/disable users of any role
  - Toggle active status on any entity

### 2. SHOP_MANAGER
- **Scope:** Own shop only
- **Capabilities:**
  - View and manage stock for assigned shop
  - Record purchases for assigned shop
  - View users of own shop
  - Create orders for own shop
  - View orders for own shop
  - Access shop-level dashboard
  - Generate P&L reports for own shop

### 3. SHOP_OPERATOR
- **Scope:** Own shop only (orders only)
- **Capabilities:**
  - Create new orders for assigned shop
  - View today's orders for assigned shop
  - View order history for assigned shop
  - Print receipts

## Implementation Details

### Backend Security

#### URL-Based Access Control (SecurityConfig)
```
/api/auth/**       → Public (no auth)
/api/public/**     → Public (no auth)
/api/admin/**      → SUPER_ADMIN only
/api/manager/**    → SUPER_ADMIN + SHOP_MANAGER
/api/orders/**     → Any authenticated user
/api/dashboard/**  → Any authenticated user
```

#### JWT Token Claims
Each JWT token contains:
- `sub` — User ID
- `role` — User's role enum
- `shopId` — Assigned shop ID (null for global admins without shop)
- `iat` — Issued at timestamp
- `exp` — Expiration (24 hours)

#### Data Filtering
All service methods enforce shop-level data filtering:
- SUPER_ADMIN can access any shopId
- SHOP_MANAGER and SHOP_OPERATOR can only access data for their assigned shopId
- The `@AuthenticationPrincipal UserPrincipal` provides `shopId` for server-side filtering

### Frontend Route Protection

#### ProtectedRoute Component
- Checks `AuthContext` for authentication status
- Accepts optional `roles` prop to restrict by role
- Redirects to `/login` if unauthenticated
- Redirects to `/dashboard` if role not authorized

#### Sidebar Navigation
Menu items are conditionally rendered based on user role:
- **All Users:** Orders (New, History)
- **Admin + Manager:** Inventory (Stock, Purchases), Reports
- **Admin Only:** Admin section (Shops, Products, Fruits, Raw Materials, Users)

### Default Admin User
On first startup, `DataInitializer` creates:
- **Shop:** "3Monks - Main Branch"
- **User:** username=`admin`, password=`admin123`, role=`SUPER_ADMIN`

## Security Rules Summary

1. Never expose user passwords in API responses
2. All data queries are filtered by shop_id based on user's role
3. SUPER_ADMIN cannot be created via API (only via DataInitializer or direct DB)
4. Inactive users cannot log in
5. Token expiration is enforced server-side
6. CORS is restricted to configured origins
7. All passwords are BCrypt-hashed
8. JWT secret is configurable via environment variable
