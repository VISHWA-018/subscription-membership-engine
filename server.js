require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const { testConnection } = require('./config/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', routes);

// View Routes
const views = ['login', 'register', 'dashboard', 'plans', 'admin'];
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'home.html')));
views.forEach(v => {
    app.get(`/${v}`, (req, res) => res.sendFile(path.join(__dirname, 'views', `${v}.html`)));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Server Error' });
});

// Start Server
const start = async () => {
    await testConnection();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
};

start();
