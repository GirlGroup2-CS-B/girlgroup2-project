/**
 * =============================================================================
 * CampusFind - Item Controller
 * =============================================================================
 * 
 * Handles all HTTP request logic for item report operations:
 * 
 * - getItems:   List all items with optional filters (type, category, search)
 * - getItem:    Retrieve a single item by its report_id
 * - createItem: Create a new lost/found item report (requires authentication)
 * - updateItem: Update an existing report (owner only, requires authentication)
 * - deleteItem: Soft-delete a report (owner only, requires authentication)
 */

const ItemModel = require('../models/itemModel');

/**
 * GET /api/items/review-queue
 * Retrieve reports awaiting administrator review.
 */
const getPendingItems = async (req, res) => {
  try {
    const items = await ItemModel.getPendingItems();
    return res.status(200).json({ count: items.length, items });
  } catch (err) {
    console.error('Error fetching report review queue:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve the review queue.' });
  }
};

/**
 * PATCH /api/items/:id/review
 * Approve or reject a pending report.
 */
const reviewItem = async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({
      error: 'status is required and must be "approved" or "rejected".'
    });
  }

  try {
    const existingItem = await ItemModel.getItemById(req.params.id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item report not found.' });
    }
    if (existingItem.listing_status !== 'Pending Review') {
      return res.status(409).json({ error: 'This report has already been reviewed.' });
    }

    const listingStatus = status === 'rejected'
      ? 'Withdrawn'
      : existingItem.report_type === 'LOST' ? 'Lost' : 'Found';
    const item = await ItemModel.reviewItem(req.params.id, listingStatus);
    if (!item) {
      return res.status(409).json({ error: 'This report has already been reviewed.' });
    }

    return res.status(200).json({ message: 'Report reviewed successfully.', item });
  } catch (err) {
    console.error('Error reviewing item report:', err.message);
    return res.status(500).json({ error: 'Failed to review item report.' });
  }
};

/**
 * GET /api/items
 * Retrieve all item reports with optional query filters.
 * 
 * Query parameters:
 *   - type: 'LOST' or 'FOUND' (filter by report type)
 *   - category: string (filter by item category)
 *   - search: string (search in item_name and description)
 */
const getItems = async (req, res) => {
  try {
    const { type, category, search } = req.query;
    const items = await ItemModel.getAllItems({ type, category, search });

    return res.status(200).json({
      count: items.length,
      items
    });
  } catch (err) {
    console.error('Error fetching items:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve items.' });
  }
};

/**
 * GET /api/items/mine
 * Retrieve the authenticated user's item reports.
 */
const getMyItems = async (req, res) => {
  try {
    const items = await ItemModel.getItemsByUser(req.user.user_id);
    return res.status(200).json({ count: items.length, items });
  } catch (err) {
    console.error('Error fetching user items:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve your items.' });
  }
};

/**
 * GET /api/items/:id
 * Retrieve a single item report by its report_id.
 */
const getItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await ItemModel.getItemById(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    return res.status(200).json(item);
  } catch (err) {
    console.error('Error fetching item:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve item.' });
  }
};

/**
 * POST /api/items
 * Create a new item report.
 * Requires authentication — the user_id is taken from the JWT token.
 * 
 * Expected request body:
 *   { item_name, category, description, report_type, image_path?,
 *     date_lost_or_found?, approximate_time?, location, additional_details?,
 *     contact_preference?, custody_information?, listing_status?, extra_data? }
 */
const createItem = async (req, res) => {
  try {
    const {
      item_name, category, description, report_type,
      image_path, date_lost_or_found, approximate_time, location,
      additional_details, contact_preference, custody_information,
      listing_status, extra_data
    } = req.body;

    // Validate required fields
    if (!item_name || !category || !description || !report_type || !location || !date_lost_or_found) {
      return res.status(400).json({
        error: 'Required fields: item_name, category, description, report_type, date_lost_or_found, location'
      });
    }

    // Validate report_type value
    if (!['LOST', 'FOUND'].includes(report_type.toUpperCase())) {
      return res.status(400).json({
        error: 'report_type must be either "LOST" or "FOUND".'
      });
    }

    // Create the item with the authenticated user's ID
    const newItem = await ItemModel.createItem({
      user_id: req.user.user_id,  // From JWT payload
      item_name,
      category,
      description,
      report_type: report_type.toUpperCase(),
      image_path,
      date_lost_or_found,
      approximate_time,
      location,
      additional_details,
      contact_preference,
      custody_information,
      listing_status,
      extra_data
    });

    return res.status(201).json({
      message: 'Item report created successfully.',
      item: newItem
    });
  } catch (err) {
    console.error('Error creating item:', err.message);
    return res.status(500).json({ error: 'Failed to create item report.' });
  }
};

/**
 * PUT /api/items/:id
 * Update an existing item report.
 * Requires authentication. Only the original reporter (owner) can update.
 */
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;

    // First, verify the item exists and check ownership
    const existingItem = await ItemModel.getItemById(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Only the owner (original reporter) can update their item
    if (existingItem.user_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden. You can only update your own item reports.'
      });
    }

    // Perform the update with the provided fields
    const updatedItem = await ItemModel.updateItem(id, req.body);
    if (!updatedItem) {
      return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    return res.status(200).json({
      message: 'Item report updated successfully.',
      item: updatedItem
    });
  } catch (err) {
    console.error('Error updating item:', err.message);
    return res.status(500).json({ error: 'Failed to update item report.' });
  }
};

/**
 * DELETE /api/items/:id
 * Soft-delete an item report (sets is_deleted = TRUE).
 * Requires authentication. Only the original reporter (owner) can delete.
 */
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // First, verify the item exists and check ownership
    const existingItem = await ItemModel.getItemById(id);
    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Only the owner can delete their item
    if (existingItem.user_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Forbidden. You can only delete your own item reports.'
      });
    }

    // Perform the soft-delete
    await ItemModel.softDeleteItem(id);

    return res.status(200).json({
      message: 'Item report deleted successfully.'
    });
  } catch (err) {
    console.error('Error deleting item:', err.message);
    return res.status(500).json({ error: 'Failed to delete item report.' });
  }
};

module.exports = {
  getItems,
  getPendingItems,
  getMyItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  reviewItem
};
