const express = require('express')
const { protect } = require('../middleware/auth')
const { connectDB, sql } = require('../config/db')

const router = express.Router()

// Simple profile update endpoint (mock, no persistent DB for now)
router.put('/update', protect, async (req, res) => {
  try {
    const { id, name, email } = req.body
    // In a real app, you'd validate and persist to DB. Here we echo back for UI feedback.
    if (!id) return res.status(400).json({ success: false, message: 'User id required' })
    // If we had a DB, you could update the users table here.
    return res.json({ success: true, user: { id, name, email } })
  } catch (err) {
    console.error('Profile update error:', err)
    return res.status(500).json({ success: false, message: 'Failed to update profile' })
  }
})

module.exports = router
