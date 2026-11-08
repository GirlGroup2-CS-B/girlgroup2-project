/**
 * =============================================================================
 * CampusFind - Claim Model
 * =============================================================================
 * 
 * This model encapsulates all database queries related to the claims table
 * in the "user" schema. Claims represent requests by users to claim ownership
 * of a found item or to confirm possession of a lost item.
 * 
 * Table: "user".claims
 * Columns: claim_id, claim_reference, item_id, claimant_user_id, explanation,
 *          distinctive_item_details, approximate_date_lost, approximate_location_lost,
 *          supporting_evidence_path, contact_preference, claim_status,
 *          reviewer_notes, reviewed_by, created_at, reviewed_at, deleted_at
 */

const pool = require('../config/db');

const ClaimModel = {

  /**
   * Retrieve all claims for a specific item report.
   * Includes claimant name for display purposes.
   * Excludes soft-deleted claims.
   * 
   * @param {number} itemId - The report_id of the item being claimed
   * @returns {Array} Array of claim rows for the item
   */
  getClaimsByItem: async (itemId) => {
    const query = `
      SELECT c.*, u.full_name AS claimant_name, u.email AS claimant_email
      FROM "user".claims c
      LEFT JOIN "user".users u ON c.claimant_user_id = u.user_id
      WHERE c.item_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [itemId]);
    return result.rows;
  },

  /**
   * Retrieve all claims submitted by a specific user.
   * Includes item name for context.
   * Excludes soft-deleted claims.
   * 
   * @param {number} userId - The claimant's user_id
   * @returns {Array} Array of claim rows by the user
   */
  getClaimsByUser: async (userId) => {
    const query = `
      SELECT c.*, ir.item_name, ir.report_type
      FROM "user".claims c
      LEFT JOIN "user".item_reports ir ON c.item_id = ir.report_id
      WHERE c.claimant_user_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  getPendingClaims: async () => {
    const query = `
      SELECT c.*, ir.item_name, ir.report_type, u.full_name AS claimant_name
      FROM "user".claims c
      JOIN "user".item_reports ir ON c.item_id = ir.report_id
      JOIN "user".users u ON c.claimant_user_id = u.user_id
      WHERE c.claim_status = 'Pending' AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Create a new claim on an item report.
   * Generates a unique claim reference using a combination of timestamp and random chars.
   * 
   * @param {Object} claimData - The claim data
   * @returns {Object} The newly created claim record
   */
  createClaim: async (claimData) => {
    const {
      item_id, claimant_user_id, explanation, distinctive_item_details,
      approximate_date_lost, approximate_location_lost,
      supporting_evidence_path, contact_preference
    } = claimData;

    // Generate a unique claim reference (e.g., CLM-20240101-ABCD)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const claim_reference = `CLM-${dateStr}-${randomChars}`;

    const query = `
      INSERT INTO "user".claims
        (claim_reference, item_id, claimant_user_id, explanation,
         distinctive_item_details, approximate_date_lost, approximate_location_lost,
         supporting_evidence_path, contact_preference, claim_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
      RETURNING *
    `;
    const values = [
      claim_reference, item_id, claimant_user_id, explanation,
      distinctive_item_details, approximate_date_lost, approximate_location_lost,
      supporting_evidence_path, contact_preference
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update the status of a claim (approve, reject, etc.).
   * Typically performed by an admin during the review process.
   * 
   * @param {number} claimId - The claim's unique ID
   * @param {Object} reviewData - Review details
   * @param {string} reviewData.claim_status - New status (e.g., 'approved', 'rejected')
   * @param {string} [reviewData.reviewer_notes] - Optional notes from the reviewer
   * @param {number} reviewData.reviewed_by - user_id of the admin reviewer
   * @returns {Object|null} The updated claim, or null if not found
   */
  updateClaimStatus: async (claimId, { claim_status, reviewer_notes, reviewed_by }) => {
    const query = `
      UPDATE "user".claims
      SET claim_status = INITCAP($1),
          reviewer_notes = $2,
          reviewed_by = $3,
          reviewed_at = NOW()
      WHERE claim_id = $4 AND deleted_at IS NULL
      RETURNING *
    `;
    const values = [claim_status, reviewer_notes, reviewed_by, claimId];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
};

module.exports = ClaimModel;
