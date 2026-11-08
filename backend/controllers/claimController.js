/**
 * =============================================================================
 * CampusFind - Claim Controller
 * =============================================================================
 * 
 * Handles all HTTP request logic for claim operations:
 * 
 * - getClaims:   Retrieve claims for a specific item report
 * - getMyClaims: Retrieve all claims submitted by the authenticated user
 * - createClaim: Submit a new claim on an item (requires authentication)
 * - reviewClaim: Approve or reject a claim (admin only)
 * 
 * Claims allow users to assert ownership of found items or confirm they
 * have found a lost item. Admins review and adjudicate these claims.
 */

const ClaimModel = require('../models/claimModel');
const NotificationModel = require('../models/notificationModel');

/**
 * GET /api/claims/pending
 * Retrieve claims awaiting administrator review.
 */
const getPendingClaims = async (req, res) => {
  try {
    const claims = await ClaimModel.getPendingClaims();
    return res.status(200).json({ count: claims.length, claims });
  } catch (err) {
    console.error('Error fetching claim review queue:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve the claim review queue.' });
  }
};

/**
 * GET /api/claims/report/:reportId
 * Retrieve all claims for a specific item report.
 */
const getClaims = async (req, res) => {
  try {
    const { reportId } = req.params;
    const claims = await ClaimModel.getClaimsByItem(reportId);

    return res.status(200).json({
      count: claims.length,
      claims
    });
  } catch (err) {
    console.error('Error fetching claims:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve claims.' });
  }
};

/**
 * GET /api/claims/my
 * Retrieve all claims submitted by the currently authenticated user.
 * Requires authentication.
 */
const getMyClaims = async (req, res) => {
  try {
    const claims = await ClaimModel.getClaimsByUser(req.user.user_id);

    return res.status(200).json({
      count: claims.length,
      claims
    });
  } catch (err) {
    console.error('Error fetching user claims:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve your claims.' });
  }
};

/**
 * POST /api/claims
 * Create a new claim on an item report.
 * Requires authentication — the claimant_user_id is taken from the JWT token.
 * 
 * Expected request body:
 *   { item_id, explanation, distinctive_item_details?, approximate_date_lost?,
 *     approximate_location_lost?, supporting_evidence_path?, contact_preference? }
 */
const createClaim = async (req, res) => {
  try {
    const {
      item_id, explanation, distinctive_item_details,
      approximate_date_lost, approximate_location_lost,
      supporting_evidence_path, contact_preference
    } = req.body;

    // Validate required fields
    if (!item_id || !explanation) {
      return res.status(400).json({
        error: 'Required fields: item_id, explanation'
      });
    }

    // Create the claim with the authenticated user's ID
    const newClaim = await ClaimModel.createClaim({
      item_id,
      claimant_user_id: req.user.user_id,  // From JWT payload
      explanation,
      distinctive_item_details,
      approximate_date_lost,
      approximate_location_lost,
      supporting_evidence_path,
      contact_preference
    });

    return res.status(201).json({
      message: 'Claim submitted successfully.',
      claim: newClaim
    });
  } catch (err) {
    console.error('Error creating claim:', err.message);
    return res.status(500).json({ error: 'Failed to submit claim.' });
  }
};

/**
 * PATCH /api/claims/:id/review
 * Review (approve or reject) a claim.
 * Requires authentication + admin role.
 * 
 * Expected request body:
 *   { claim_status: 'approved' | 'rejected', reviewer_notes? }
 */
const reviewClaim = async (req, res) => {
  try {
    const { id } = req.params;
    const { claim_status, reviewer_notes } = req.body;

    // Validate claim_status
    const validStatuses = ['approved', 'rejected'];
    if (!claim_status || !validStatuses.includes(claim_status)) {
      return res.status(400).json({
        error: 'claim_status is required and must be "approved" or "rejected".'
      });
    }

    // Update the claim status with the admin's review
    const updatedClaim = await ClaimModel.updateClaimStatus(id, {
      claim_status,
      reviewer_notes: reviewer_notes || null,
      reviewed_by: req.user.user_id  // Admin's user_id from JWT
    });

    if (!updatedClaim) {
      return res.status(404).json({ error: 'Claim not found.' });
    }

    // Send a notification to the claimant about the review outcome
    await NotificationModel.createNotification({
      user_id: updatedClaim.claimant_user_id,
      title: `Claim ${claim_status.charAt(0).toUpperCase() + claim_status.slice(1)}`,
      message: `Your claim (${updatedClaim.claim_reference}) has been ${claim_status}.${reviewer_notes ? ' Notes: ' + reviewer_notes : ''}`,
      related_claim_id: updatedClaim.claim_id
    });

    return res.status(200).json({
      message: `Claim ${claim_status} successfully.`,
      claim: updatedClaim
    });
  } catch (err) {
    console.error('Error reviewing claim:', err.message);
    return res.status(500).json({ error: 'Failed to review claim.' });
  }
};

module.exports = {
  getClaims,
  getPendingClaims,
  getMyClaims,
  createClaim,
  reviewClaim
};
