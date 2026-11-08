/**
 * =============================================================================
 * CampusFind - Notification Routes
 * =============================================================================
 * 
 * Defines the API endpoints for notification operations:
 * 
 *   GET   /api/notifications          - Get all notifications for the user
 *   PATCH /api/notifications/:id/read - Mark a notification as read
 * 
 * All routes require authentication — users can only access their own
 * notifications.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getNotifications, markRead } = require('../controllers/notificationController');

// GET /api/notifications — Get all notifications for the authenticated user
router.get('/', authenticate, getNotifications);

// PATCH /api/notifications/:id/read — Mark a notification as read
router.patch('/:id/read', authenticate, markRead);

module.exports = router;
