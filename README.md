# Subscription-Based Membership Engine with Tiered Logic

A production-ready full-stack web application implementing a subscription management system with tier-based access control, JWT authentication, automatic subscription expiry, and an admin dashboard.

---

## 🚀 Tech Stack

| Layer       | Technology               |
| ----------- | ------------------------ |
| Frontend    | HTML, CSS, JavaScript    |
| Backend     | Node.js + Express        |
| Database    | MySQL                    |
| Auth        | JWT + bcrypt             |
| Architecture| MVC (Model-View-Controller) |

---

## 📁 Project Structure

```
/project-root
├── config/
│   └── db.js                    # MySQL connection pool
├── controllers/
│   ├── authController.js        # Register, login, profile
│   ├── subscriptionController.js # Plans, subscribe, content access
│   └── adminController.js       # Plan CRUD, user/sub management
├── models/
│   ├── userModel.js             # User database operations
│   ├── planModel.js             # Plan database operations
│   └── subscriptionModel.js     # Subscription database operations
├── routes/
│   ├── authRoutes.js            # Auth endpoints
│   ├── subscriptionRoutes.js    # Subscription & tier content endpoints
│   └── adminRoutes.js           # Admin-only endpoints
├── middleware/
│   ├── authMiddleware.js        # JWT verification (Layer 1)
│   ├── expiryMiddleware.js      # Subscription expiry check (Layer 2)
│   ├── tierMiddleware.js        # Tier access control (Layer 3)
│   └── adminMiddleware.js       # Admin role verification
├── views/
│   ├── home.html                # Landing page
│   ├── login.html               # Login form
│   ├── register.html            # Registration form
│   ├── dashboard.html           # User dashboard
│   ├── plans.html               # Plan selection
│   └── admin.html               # Admin panel
├── public/
│   ├── css/styles.css           # Design system
│   └── js/app.js                # Frontend logic
├── database/
│   └── schema.sql               # Database schema + seed data
├── .env                         # Environment variables
├── server.js                    # Express server entry point
├── package.json                 # Dependencies
└── README.md                    # This file
```

---

## 🛠️ Installation Guide

### Prerequisites

- **Node.js** v18 or higher
- **MySQL** 8.0 or higher
- **npm** (comes with Node.js)

### Step 1: Clone / Navigate to Project

```bash
cd fullstackproject
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

Edit the `.env` file with your MySQL credentials:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=membership_engine
DB_PORT=3306
JWT_SECRET=change_this_to_a_random_secret_string
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
```

### Step 4: Create the Database

Run the SQL schema file in your MySQL client:

```bash
mysql -u root -p < database/schema.sql
```

Or open `database/schema.sql` in MySQL Workbench / phpMyAdmin and execute it.

### Step 5: Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### Step 6: Open in Browser

Navigate to `http://localhost:3000`

---

## 🧪 Test Credentials

| Role  | Email              | Password    |
| ----- | ------------------ | ----------- |
| Admin | admin@example.com  | password123 |
| User  | john@example.com   | password123 |
| User  | jane@example.com   | password123 |
| User  | bob@example.com    | password123 |

**Seed subscriptions:**
- John → Basic plan
- Jane → Premium plan
- Bob → Enterprise plan

---

## 📡 API Documentation

### Authentication

| Method | Endpoint            | Auth | Description          |
| ------ | ------------------- | ---- | -------------------- |
| POST   | `/api/auth/register`| No   | Register new user    |
| POST   | `/api/auth/login`   | No   | Login, returns JWT   |
| GET    | `/api/auth/profile` | Yes  | Get user profile     |

### Subscriptions

| Method | Endpoint                              | Auth | Description                    |
| ------ | ------------------------------------- | ---- | ------------------------------ |
| GET    | `/api/subscriptions/plans`            | No   | List all plans                 |
| GET    | `/api/subscriptions/my-subscription`  | Yes  | Get user's subscription        |
| POST   | `/api/subscriptions/subscribe`        | Yes  | Subscribe to a plan            |
| PUT    | `/api/subscriptions/change-plan`      | Yes  | Upgrade/downgrade plan         |
| POST   | `/api/subscriptions/renew`            | Yes  | Renew subscription             |
| GET    | `/api/subscriptions/basic-content`    | Yes* | Basic tier content (Level 1+)  |
| GET    | `/api/subscriptions/premium-content`  | Yes* | Premium tier content (Level 2+)|
| GET    | `/api/subscriptions/enterprise-content`| Yes*| Enterprise content (Level 3)   |

*\*Requires active subscription with sufficient tier level*

### Admin (requires admin role)

| Method | Endpoint                                | Description                 |
| ------ | --------------------------------------- | --------------------------- |
| GET    | `/api/admin/dashboard`                  | Dashboard statistics        |
| GET    | `/api/admin/users`                      | List all users              |
| GET    | `/api/admin/subscriptions`              | List all subscriptions      |
| POST   | `/api/admin/plans`                      | Create new plan             |
| PUT    | `/api/admin/plans/:id`                  | Update plan                 |
| DELETE | `/api/admin/plans/:id`                  | Delete plan                 |
| PATCH  | `/api/admin/subscriptions/:id/expire`   | Manually expire subscription|
| POST   | `/api/admin/expire-overdue`             | Batch expire all overdue    |

---

## ⚙️ Tier Logic Engine — How It Works

The tier access engine is the core of this system. It uses a **3-layer middleware chain** to control access to protected resources.

### The Middleware Chain

```
HTTP Request
    │
    ▼
┌──────────────────┐
│ 1. authMiddleware │  ← Verify JWT token, extract user identity
│                    │    Fail → 401 Unauthorized
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ 2. expiryMiddleware   │  ← Load subscription from DB
│                        │    Check if end_date < today
│                        │    If expired → auto-update status to 'expired'
│                        │    Fail → 403 Subscription Expired
└────────┬──────────────┘
         │
         ▼
┌──────────────────────────┐
│ 3. tierMiddleware(level)  │  ← Compare user's plan access_level
│                            │    with route's required level
│                            │    Check: access_level >= requiredLevel
│                            │    Check download limits
│                            │    Fail → 403 Insufficient Tier
└────────┬───────────────────┘
         │
         ▼
┌──────────────┐
│  Controller   │  ← Serve the protected content
└──────────────┘
```

### Access Level Hierarchy

| Plan       | access_level | /basic | /premium | /enterprise |
| ---------- | ------------ | ------ | -------- | ----------- |
| Basic      | 1            | ✅     | ❌       | ❌          |
| Premium    | 2            | ✅     | ✅       | ❌          |
| Enterprise | 3            | ✅     | ✅       | ✅          |

**Key principle:** Higher tiers **inherit** access to all lower-tier content. This is achieved by the simple comparison `access_level >= requiredLevel`.

### Expiry Logic (Lazy Expiry Pattern)

Instead of a background cron job, the system uses a **lazy expiry** approach:

1. Every time a user accesses a protected route, `expiryMiddleware` runs
2. It compares `today` vs `subscription.end_date`
3. If expired, it immediately updates the DB status to `'expired'`
4. The same check runs on login in `authController`

This ensures subscription status is always accurate when accessed, without the overhead of a scheduled job.

### Download Limit Enforcement

Each plan defines a `max_download_limit`:
- **Basic:** 50 downloads/month
- **Premium:** 500 downloads/month
- **Enterprise:** Unlimited (0 = no limit)

When accessing tier content, `tierMiddleware` checks:
```
if (download_count >= max_download_limit) → deny with upgrade suggestion
```

Each successful content access increments the `download_count`.

---

## 🔒 Security Measures

- **Password Hashing:** bcrypt with 12 salt rounds
- **JWT Authentication:** Tokens expire after 24h
- **Input Validation:** express-validator on all inputs
- **SQL Injection Prevention:** Parameterized queries (mysql2)
- **Security Headers:** Helmet middleware
- **CORS:** Configured for cross-origin requests
- **Secrets in .env:** Never hardcoded

---

## 📄 License

MIT License
