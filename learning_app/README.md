# Enterprise Technical Training & Learning Management System (LMS)

A full-stack, enterprise-grade Learning Management System built with **Next.js 16 (App Router & Turbopack)**, **Tailwind CSS**, and **MySQL 8.0+**. Designed specifically for engineering, manufacturing plants, and multi-department corporate environments.

---

## Key Highlights & Features

- **Multi-Department Role-Based Access Control (RBAC):**
  - Granular course assignment across 12 pre-configured departments:
    `HR`, `SAFETY`, `MAINTENANCE`, `PRODUCTION`, `QUALITY`, `DESIGN`, `DEVELOPMENT`, `IT`, `AI`, `CENTRAL_PROCESSING_ENGINEERING`, `STORE`, `DISPATCH`.
  - Courses can be visible to **ALL** departments (e.g. Mandatory Safety Training) or targeted exclusively to selected departments.
- **Controlled User Registration:**
  - Public registration is strictly restricted. Only Administrators can provision, edit, and manage employee accounts through the Admin Portal or the CLI script.
- **Anti-Skip Video Player & Integrity Enforcement:**
  - Native HTML5 video player and YouTube stream embed integration.
  - Forward-seeking restrictions prevent users from skipping content.
  - Periodic watch-time heartbeat logging (every 5 seconds) records actual watch time in seconds.
  - Interactive mid-video quiz checkpoints with automatic rewinds upon consecutive failed attempts.
- **Automated Certificate Generation:**
  - Dynamic verification and certificate issuance upon 100% completion of course lessons and quizzes.
  - High-resolution, print-optimized certificate layout (`@media print`) with QR verification stamps and custom signatory branding.
- **Real-Time Admin Analytics & Telemetry:**
  - Real-time video watch-time calculations with adaptive minute/hour scaling.
  - 7-day watch activity trend SVG chart.
  - Live MySQL engine health, ping latency, and disk footprint telemetry in Admin Settings.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 16.2.4 (React 19, App Router, Turbopack), Lucide Icons |
| **Styling** | Tailwind CSS v4 |
| **Backend & APIs** | Next.js Server Components, Server Actions & Route Handlers |
| **Database** | MySQL 8.0+ (`mysql2/promise` connection pooling) |
| **Authentication** | Custom HTTP-only JWT Cookie Session with Bcrypt password hashing |
| **State Management**| Zustand (Client-side sync & optimistic progress updates) |

---

## Getting Started

### 1. Prerequisites
- Node.js `v20.x` or `v22.x`
- MySQL Server 8.0+ running on `127.0.0.1:3306` (or cloud instance)

### 2. Database Setup
Execute the complete schema file to create the database and all 11 tables:
```bash
mysql -u root -p < db/final_schema_server.sql
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=learning_app_db
JWT_SECRET=your_super_secret_jwt_key_here
ALLOW_ADMIN_BYPASS=false
```

### 4. Create Initial Administrator Account
```bash
node scripts/create-admin.js --email admin@company.com --password YourAdminPassword123 --role admin
```

### 5. Install Dependencies & Run
```bash
npm install
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## Production Build & Deployment

### Build Verification
```bash
npm run build
```
Ensure build exits with code `0`.

### Running in Production
```bash
npm run start
```
By default, the server binds to `0.0.0.0:3000` and is ready behind an Nginx reverse proxy or Docker container.
