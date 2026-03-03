# Subscription Membership Engine (Simplified)

A clean, minimal implementation of a subscription-based membership system with JWT authentication and tier-based access control.

## 🚀 Features
- **Auth**: Secure JWT-based login and registration.
- **Tiers**: Basic, Premium, and Enterprise access levels.
- **Access Control**: Dynamic content protection based on subscription level.
- **Simple MVC**: Consolidated folder structure for easier review.

## 📁 Structure
- `server.js`: Main entry point & routing.
- `controllers/index.js`: Business logic.
- `models/index.js`: Database queries (MySQL).
- `middleware/index.js`: Auth & Tier verification.
- `public/`: Frontend assets (HTML/CSS/JS).

## 🛠️ Quick Start
1. **Setup DB**: `mysql -u root -p < database/schema.sql`
2. **Setup Env**: Configure `.env` with your DB credentials.
3. **Install**: `npm install`
4. **Run**: `npm run dev`

## 🧪 Test Users
- **Admin**: `admin@example.com` / `password123`
- **User**: `john@example.com` / `password123`
