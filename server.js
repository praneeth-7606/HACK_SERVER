require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const policyRoutes = require('./routes/policyRoutes');
const aiRoutes = require('./routes/aiRoutes');
const concernRoutes = require('./routes/concernRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const agentRoutes = require('./routes/agentRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased for development to prevent 429s
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Auth-specific rate limiter (stricter)
// Auth-specific rate limiter (stricter)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Increased for development
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://hack-client-wheat.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Priority Routes (Before global limiter)
app.use('/api/user-alerts', notificationRoutes);

app.use(limiter);

// API Routes
app.use('/api/concerns', concernRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/agents', agentRoutes);
app.get('/api/test', (req, res) => res.json({ success: true, message: 'API is reachable' }));

// Serve uploads directory specifically for concerns and policies
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'CivicConnect API is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Welcome route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🏛️ Welcome to CivicConnect API',
        description: 'Bridging Citizens and Governance',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            health: '/api/health'
        }
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found.`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error.',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🏛️  CivicConnect Server                                  ║
║                                                            ║
║   ✅ Server running on port ${PORT}                          ║
║   📍 http://localhost:${PORT}                                ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
