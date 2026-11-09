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
const multer = require('multer');
const path = require('path');
const { randomUUID } = require('crypto');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  getItems, getPendingItems, getMyItems, getItem, createItem, updateItem,
  deleteItem, reviewItem
} = require('../controllers/itemController');

const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};
const uploadImage = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, callback) => {
      callback(null, `${randomUUID()}${imageExtensions[file.mimetype] || ''}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      return callback(new Error('Upload a JPEG, PNG, GIF, or WEBP image.'));
    }
    return callback(null, true);
  }
});

const handleImageUpload = (req, res, next) => {
  uploadImage.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Images must be 5 MB or smaller.' });
    }
    return res.status(400).json({ error: error.message || 'Unable to upload image.' });
  });
};

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
router.post('/', authenticate, handleImageUpload, createItem);

// PUT /api/items/:id — Update an existing item report (owner only)
router.put('/:id', authenticate, updateItem);

// DELETE /api/items/:id — Soft-delete an item report (owner only)
router.delete('/:id', authenticate, deleteItem);

module.exports = router;
