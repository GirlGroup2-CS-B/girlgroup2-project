const UserModel = require('../models/userModel');

const listUsers = async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    return res.status(200).json({ count: users.length, users });
  } catch (err) {
    console.error('Error fetching account list:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve accounts.' });
  }
};

const getAccountStatistics = async (req, res) => {
  try {
    const statistics = await UserModel.getAccountStatistics();
    return res.status(200).json({ statistics });
  } catch (err) {
    console.error('Error fetching account statistics:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve account statistics.' });
  }
};

const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (!/^[1-9]\d*$/.test(id)) {
    return res.status(400).json({ error: 'A valid account ID is required.' });
  }
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean.' });
  }
  if (String(req.user.user_id) === id && !is_active) {
    return res.status(409).json({ error: 'You cannot deactivate your own account.' });
  }

  try {
    const user = await UserModel.setUserActiveStatus(id, is_active);
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (user.role === 'admin' && user.is_active !== is_active) {
      return res.status(409).json({ error: 'Administrator account status cannot be changed here.' });
    }

    return res.status(200).json({
      message: `Account ${is_active ? 'activated' : 'deactivated'} successfully.`,
      user
    });
  } catch (err) {
    console.error('Error updating account status:', err.message);
    return res.status(500).json({ error: 'Failed to update account status.' });
  }
};

module.exports = { listUsers, getAccountStatistics, updateUserStatus };
