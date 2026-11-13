/**
 * =============================================================================
 * CampusFind - Main Server Entry Point
 * =============================================================================
 * 
 * This is the main Express application file that:
 * 1. Loads environment variables from .env
 * 2. Initializes the Express app with middleware (CORS, JSON parsing)
 * 3. Mounts all route modules under their respective API paths
 * 4. Starts the HTTP server on the configured port
 * 
 * API Route Map:
 *   /api/auth          → Authentication (register, login)
 *   /api/items          → Item reports (CRUD for lost & found items)
 *   /api/claims         → Claims (submit, review, track claims)
 *   /api/notifications  → Notifications (view, mark as read)
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const apiDocs = require('./openapi');

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();

// =============================================================================
// Middleware
// =============================================================================

// Enable Cross-Origin Resource Sharing for frontend integration
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================================================
// Import Route Modules
// =============================================================================

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

// =============================================================================
// Mount Routes
// =============================================================================

// Root endpoint — health check / welcome message
app.get('/', (req, res) => {
  res.json({ message: 'CampusFind API is running...' });
});

// Authentication routes (register, login)
app.use('/api/auth', authRoutes);

// Item report routes (CRUD for lost & found items)
app.use('/api/items', itemRoutes);

// Claim routes (submit and review claims)
app.use('/api/claims', claimRoutes);

// Notification routes (view and manage notifications)
app.use('/api/notifications', notificationRoutes);

// Administrator account management
app.use('/api/admin', adminRoutes);

// Interactive API documentation and its OpenAPI specification
app.get('/docs/openapi.json', (req, res) => {
  res.json(apiDocs);
});
app.use('/docs', swaggerUi.serve, swaggerUi.setup(apiDocs, {
  customSiteTitle: 'CampusFind API Documentation',
  swaggerOptions: {
    docExpansion: 'list',
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));

// =============================================================================
// 404 Handler — Catch unmatched routes
// =============================================================================

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// =============================================================================
// Global Error Handler
// =============================================================================

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON payload.',
      detail: err.message
    });
  }

  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    error: 'Internal server error.',
    detail: err.message
  });
});

// =============================================================================
// Start Server
// =============================================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CampusFind API server running on http://0.0.0.0:${PORT}`);
  console.log(`📚 API documentation available at http://localhost:${PORT}/docs`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
