/**
 * =============================================================================
 * CampusFind - Notification Model
 * =============================================================================
 * 
 * This model encapsulates all database queries related to the notifications table
 * in the "user" schema. Notifications keep users informed about claim updates,
 * item matches, and system announcements.
 * 
 * Table: "user".notifications
 * Columns: notification_id, user_id, title, message, read_status,
 *          related_report_id, related_claim_id, created_at, read_at, deleted_at
 */

const pool = require('../config/db');

const NotificationModel = {

  /**
   * Retrieve all active notifications for a specific user.
   * Excludes soft-deleted notifications (where deleted_at IS NOT NULL).
   * Ordered by most recent first.
   * 
   * @param {number} userId - The user's unique ID
   * @returns {Array} Array of notification rows for the user
   */
  getNotificationsByUser: async (userId) => {
    const query = `
      SELECT * FROM "user".notifications
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  /**
   * Create a new notification for a user.
   * Can optionally link to a specific item report or claim.
   * 
   * @param {Object} notifData - Notification data
   * @param {number} notifData.user_id - Target user's ID
   * @param {string} notifData.title - Notification title/heading
   * @param {string} notifData.message - Notification body/message
   * @param {number} [notifData.related_report_id] - Optional linked report ID
   * @param {number} [notifData.related_claim_id] - Optional linked claim ID
   * @returns {Object} The newly created notification record
   */
  createNotification: async ({ user_id, title, message, related_report_id = null, related_claim_id = null }) => {
    const query = `
      INSERT INTO "user".notifications
        (user_id, title, message, read_status, related_report_id, related_claim_id)
      VALUES ($1, $2, $3, FALSE, $4, $5)
      RETURNING *
    `;
    const values = [user_id, title, message, related_report_id, related_claim_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Mark a specific notification as read.
   * Sets read_status to TRUE and records the current timestamp in read_at.
   * 
   * @param {number} notificationId - The notification's unique ID
   * @returns {Object|null} The updated notification, or null if not found
   */
  markAsRead: async (notificationId, userId) => {
    const query = `
      UPDATE "user".notifications
      SET read_status = TRUE, read_at = NOW()
      WHERE notification_id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    const result = await pool.query(query, [notificationId, userId]);
    return result.rows[0] || null;
  }
};

module.exports = NotificationModel;
