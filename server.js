/**
 * ============================================================
 * Subscription-Based Membership Engine with Tiered Logic
 * ============================================================
 * 
 * Main server entry point.
 * Configures Express, middleware, routes, and starts the server.
 * 
 * Architecture: MVC (Model-View-Controller)
 * Auth: JWT-based authentication
 * Database: MySQL with connection pooling
 * ============================================================
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Database
const { testConnection } = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================
// GLOBAL MIDDLEWARE
// ==============================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: false  // Disabled for serving inline scripts in views
}));

// CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================
// VIEW ROUTES (Serve HTML pages)
// ==============================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.get('/plans', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'plans.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ==============================================
// API ROUTES
// ==============================================

app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// ==============================================
// GLOBAL ERROR HANDLER
// ==============================================

/**
 * Centralized error handling middleware.
 * Catches all errors thrown in route handlers and middleware.
 * Returns consistent error response format.
 */
app.use((err, req, res, next) => {
    console.error('🔥 Error:', err.message);
    console.error(err.stack);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
});

// 404 handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { message: `Route ${req.originalUrl} not found` }
    });
});

// ==============================================
// START SERVER
// ==============================================

const startServer = async () => {
    // Test database connection before starting
    await testConnection();

    app.listen(PORT, () => {
        console.log(`\n🚀 Membership Engine running on http://localhost:${PORT}`);
        console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📦 API Base: http://localhost:${PORT}/api\n`);
    });
};

startServer();
