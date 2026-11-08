/**
 * =============================================================================
 * CampusFind - Item Report Model
 * =============================================================================
 * 
 * This model encapsulates all database queries related to the item_reports table
 * in the "user" schema. It supports CRUD operations for lost and found item
 * listings, including soft-delete functionality.
 * 
 * Table: "user".item_reports
 * Columns: report_id, user_id, item_name, category, description, report_type,
 *          image_path, date_lost_or_found, approximate_time, location,
 *          additional_details, contact_preference, custody_information,
 *          listing_status, extra_data, created_at, updated_at, is_deleted
 */

const pool = require('../config/db');

const ItemModel = {

  /**
   * Retrieve all item reports that have not been soft-deleted.
   * Supports optional filtering by report_type, category, and search keyword.
   * Results are ordered by most recently created first.
   * 
   * @param {Object} filters - Optional query filters
   * @param {string} [filters.type] - Filter by report_type ('LOST' or 'FOUND')
   * @param {string} [filters.category] - Filter by item category
   * @param {string} [filters.search] - Search keyword (matches item_name or description)
   * @returns {Array} Array of item report rows
   */
  getAllItems: async (filters = {}) => {
    let query = `
      SELECT ir.*, u.full_name AS reporter_name
      FROM "user".item_reports ir
      LEFT JOIN "user".users u ON ir.user_id = u.user_id
      WHERE ir.is_deleted = FALSE
        AND ir.listing_status NOT IN ('Pending Review', 'Withdrawn')
    `;
    const values = [];
    let paramIndex = 1;

    // Filter by report type (LOST or FOUND)
    if (filters.type) {
      query += ` AND ir.report_type = $${paramIndex}`;
      values.push(filters.type.toUpperCase());
      paramIndex++;
    }

    // Filter by category
    if (filters.category) {
      query += ` AND ir.category = $${paramIndex}`;
      values.push(filters.category);
      paramIndex++;
    }

    // Search by item name or description (case-insensitive)
    if (filters.search) {
      query += ` AND (ir.item_name ILIKE $${paramIndex} OR ir.description ILIKE $${paramIndex})`;
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` ORDER BY ir.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
  },

  /**
   * Retrieve a single item report by its report_id.
   * Only returns the item if it has not been soft-deleted.
   * 
   * @param {number} reportId - The report's unique ID
   * @returns {Object|null} The item report row or null if not found
   */
  getItemById: async (reportId) => {
    const query = `
      SELECT ir.*, u.full_name AS reporter_name, u.email AS reporter_email
      FROM "user".item_reports ir
      LEFT JOIN "user".users u ON ir.user_id = u.user_id
      WHERE ir.report_id = $1 AND ir.is_deleted = FALSE
    `;
    const result = await pool.query(query, [reportId]);
    return result.rows[0] || null;
  },

  /**
   * Retrieve all item reports of a specific type (LOST or FOUND).
   * 
   * @param {string} reportType - 'LOST' or 'FOUND'
   * @returns {Array} Array of matching item report rows
   */
  getItemsByType: async (reportType) => {
    const query = `
      SELECT ir.*, u.full_name AS reporter_name
      FROM "user".item_reports ir
      LEFT JOIN "user".users u ON ir.user_id = u.user_id
      WHERE ir.report_type = $1 AND ir.is_deleted = FALSE
      ORDER BY ir.created_at DESC
    `;
    const result = await pool.query(query, [reportType.toUpperCase()]);
    return result.rows;
  },

  /**
   * Retrieve all item reports submitted by a specific user.
   * 
   * @param {number} userId - The user's unique ID
   * @returns {Array} Array of item report rows belonging to the user
   */
  getItemsByUser: async (userId) => {
    const query = `
      SELECT ir.*, u.full_name AS reporter_name
      FROM "user".item_reports ir
      LEFT JOIN "user".users u ON ir.user_id = u.user_id
      WHERE ir.user_id = $1 AND ir.is_deleted = FALSE
      ORDER BY ir.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  getPendingItems: async () => {
    const query = `
      SELECT ir.*, u.full_name AS reporter_name
      FROM "user".item_reports ir
      LEFT JOIN "user".users u ON ir.user_id = u.user_id
      WHERE ir.is_deleted = FALSE AND ir.listing_status = 'Pending Review'
      ORDER BY ir.created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  reviewItem: async (reportId, listingStatus) => {
    const query = `
      UPDATE "user".item_reports
      SET listing_status = $1, updated_at = NOW()
      WHERE report_id = $2
        AND is_deleted = FALSE
        AND listing_status = 'Pending Review'
      RETURNING *
    `;
    const result = await pool.query(query, [listingStatus, reportId]);
    return result.rows[0] || null;
  },

  /**
   * Create a new item report (lost or found listing).
   * 
   * @param {Object} itemData - The item report data
   * @returns {Object} The newly created item report record
   */
  createItem: async (itemData) => {
    const {
      user_id, item_name, category, description, report_type,
      image_path, date_lost_or_found, approximate_time, location,
      additional_details, contact_preference, custody_information,
      listing_status = 'Pending Review', extra_data = {}
    } = itemData;

    const query = `
      INSERT INTO "user".item_reports
        (user_id, item_name, category, description, report_type,
         image_path, date_lost_or_found, approximate_time, location,
         additional_details, contact_preference, custody_information,
         listing_status, extra_data)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      user_id, item_name, category, description, report_type,
      image_path, date_lost_or_found, approximate_time, location,
      additional_details, contact_preference, custody_information,
      listing_status, extra_data
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update an existing item report.
   * Only updates the fields that are provided in the updateData object.
   * 
   * @param {number} reportId - The report's unique ID
   * @param {Object} updateData - Key-value pairs of fields to update
   * @returns {Object|null} The updated item report, or null if not found
   */
  updateItem: async (reportId, updateData) => {
    // Build dynamic SET clause from provided fields
    const allowedFields = [
      'item_name', 'category', 'description', 'report_type',
      'image_path', 'date_lost_or_found', 'approximate_time', 'location',
      'additional_details', 'contact_preference', 'custody_information',
      'listing_status', 'extra_data'
    ];

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(updateData[field]);
        paramIndex++;
      }
    }

    // Always update the updated_at timestamp
    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length === 1) {
      // Only updated_at was added — nothing meaningful to update
      return null;
    }

    values.push(reportId);
    const query = `
      UPDATE "user".item_reports
      SET ${setClauses.join(', ')}
      WHERE report_id = $${paramIndex} AND is_deleted = FALSE
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Soft-delete an item report by setting is_deleted = TRUE.
   * The record remains in the database but is excluded from normal queries.
   * 
   * @param {number} reportId - The report's unique ID
   * @returns {Object|null} The soft-deleted item report, or null if not found
   */
  softDeleteItem: async (reportId) => {
    const query = `
      UPDATE "user".item_reports
      SET is_deleted = TRUE, updated_at = NOW()
      WHERE report_id = $1 AND is_deleted = FALSE
      RETURNING *
    `;
    const result = await pool.query(query, [reportId]);
    return result.rows[0] || null;
  }
};

module.exports = ItemModel;
