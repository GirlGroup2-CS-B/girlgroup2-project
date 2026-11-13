/**
 * =============================================================================
 * CampusFind - Claim Routes
 * =============================================================================
 * 
 * Defines the API endpoints for claim operations:
 * 
 *   GET   /api/claims/report/:reportId  - Get all claims for an item report
 *   GET   /api/claims/my                - Get all claims by the authenticated user
 *   POST  /api/claims                   - Submit a new claim (auth required)
 *   PATCH /api/claims/:id/review        - Review a claim (auth + admin required)
 * 
 * Protected routes require a valid JWT token.
 * Admin routes additionally require the user to have the 'admin' role.
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  getClaims, getPendingClaims, getMyClaims, createClaim, reviewClaim
} = require('../controllers/claimController');

// GET /api/claims/pending — List claims awaiting administrator review
router.get('/pending', authenticate, authorizeAdmin, getPendingClaims);

// GET /api/claims/report/:reportId — Get all claims for a specific item report
router.get('/report/:reportId', getClaims);

// GET /api/claims/my — Get all claims submitted by the authenticated user
router.get('/my', authenticate, getMyClaims);

// POST /api/claims — Submit a new claim on an item
router.post('/', authenticate, createClaim);

// PATCH /api/claims/:id/review — Approve or reject a claim (admin only)
router.patch('/:id/review', authenticate, authorizeAdmin, reviewClaim);

module.exports = router;
