const express = require('express');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Basic protected dashboard endpoint
router.get('/', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard data',
    user: req.user,
  });
});

module.exports = router;

