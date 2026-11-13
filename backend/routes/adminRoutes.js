const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const {
  listUsers,
  getAccountStatistics,
  updateUserStatus
} = require('../controllers/adminController');

router.use(authenticate, authorizeAdmin);
router.get('/stats', getAccountStatistics);
router.get('/users', listUsers);
router.patch('/users/:id/status', updateUserStatus);

module.exports = router;
