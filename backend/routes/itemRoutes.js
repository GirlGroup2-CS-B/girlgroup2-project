/**
 * =============================================================================
 * CampusFind - Item Report Routes
 * =============================================================================
 * 
 * Defines the API endpoints for item report operations:
 * 
 *   GET    /api/items       - List all items (with optional filters)
 *   GET    /api/items/:id   - Get a single item by ID
 *   POST   /api/items       - Create a new item report (auth required)
 *   PUT    /api/items/:id   - Update an item report (auth required, owner only)
 *   DELETE /api/items/:id   - Soft-delete an item report (auth required, owner only)
 * 
 * Public routes: GET endpoints (anyone can browse items)
 * Protected routes: POST, PUT, DELETE (require valid JWT token)
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  getItems, getPendingItems, getMyItems, getItem, createItem, updateItem,
  deleteItem, reviewItem
} = require('../controllers/itemController');

// --- Public Routes ---

// GET /api/items — List all items with optional query filters (?type=LOST&category=Electronics&search=phone)
router.get('/', getItems);

// Administrator-only listing moderation
router.get('/review-queue', authenticate, authorizeAdmin, getPendingItems);
router.patch('/:id/review', authenticate, authorizeAdmin, reviewItem);

// GET /api/items/mine — List the authenticated user's reports
router.get('/mine', authenticate, getMyItems);

// GET /api/items/:id — Get a single item report by report_id
router.get('/:id', getItem);

// --- Protected Routes (require authentication) ---

// POST /api/items — Create a new lost/found item report
router.post('/', authenticate, createItem);

// PUT /api/items/:id — Update an existing item report (owner only)
router.put('/:id', authenticate, updateItem);

// DELETE /api/items/:id — Soft-delete an item report (owner only)
router.delete('/:id', authenticate, deleteItem);

module.exports = router;
