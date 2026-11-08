/**
 * =============================================================================
 * CampusFind - Notification Controller
 * =============================================================================
 * 
 * Handles all HTTP request logic for notification operations:
 * 
 * - getNotifications: Retrieve all notifications for the authenticated user
 * - markRead:         Mark a specific notification as read
 * 
 * All endpoints require authentication. Users can only access their own
 * notifications.
 */

const NotificationModel = require('../models/notificationModel');

/**
 * GET /api/notifications
 * Retrieve all notifications for the currently authenticated user.
 * Returns notifications ordered by most recent first.
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await NotificationModel.getNotificationsByUser(req.user.user_id);

    // Calculate unread count for convenience
    const unreadCount = notifications.filter(n => !n.read_status).length;

    return res.status(200).json({
      count: notifications.length,
      unread_count: unreadCount,
      notifications
    });
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read.
 * Sets read_status = TRUE and records the read timestamp.
 */
const markRead = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedNotification = await NotificationModel.markAsRead(
      id,
      req.user.user_id,
    );

    if (!updatedNotification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    // Ensure the notification belongs to the authenticated user
    if (updatedNotification.user_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden. You can only manage your own notifications.'
      });
    }

    return res.status(200).json({
      message: 'Notification marked as read.',
      notification: updatedNotification
    });
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
};

module.exports = { getNotifications, markRead };
