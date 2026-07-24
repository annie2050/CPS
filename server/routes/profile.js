const express = require('express')
const { protect } = require('../middleware/auth')

const router = express.Router()

// Profile update endpoint (uses existing /api/auth/update-password endpoint)
router.put('/update', protect, async (req, res) => {
  const { id, name, email } = req.body;
  if (!id) return res.status(400).json({ success: false, message: 'User id required' });
  return res.json({ success: true, user: { id, name, email } });
});

module.exports = router;
