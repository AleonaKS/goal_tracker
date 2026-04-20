const express = require('express')
const Joi = require('joi')
const Achievement = require('../models/Achievement')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const achievementSchema = Joi.object({
  type: Joi.string().valid('habit', 'counter', 'task').required(),
  title: Joi.string().required().max(100),
  description: Joi.string().allow('').max(500),
  value: Joi.number().allow(null),
  date: Joi.date().default(Date.now)
})

// @route   GET /api/achievements
// @desc    Get all achievements for logged-in user
router.get('/', async (req, res) => {
  try {
    const { type, startDate, endDate, limit = 50 } = req.query
    
    // Build query
    const query = { userId: req.user._id.toString() }
    
    if (type) query.type = type
    if (startDate) query.date = { $gte: new Date(startDate) }
    if (endDate) {
      query.date = query.date || {}
      query.date.$lte = new Date(endDate)
    }
    
    const achievements = await Achievement.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
    
    res.json(achievements)
  } catch (error) {
    console.error('Get achievements error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/achievements
// @desc    Create a new achievement
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = achievementSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const achievement = new Achievement({
      ...req.body,
      userId: req.user._id.toString()
    })

    await achievement.save()
    res.status(201).json(achievement)
  } catch (error) {
    console.error('Create achievement error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/achievements/:id
// @desc    Get achievement by ID
router.get('/:id', checkOwnership(Achievement), async (req, res) => {
  try {
    res.json(req.resource)
  } catch (error) {
    console.error('Get achievement error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/achievements/:id
// @desc    Update achievement
router.put('/:id', checkOwnership(Achievement), async (req, res) => {
  try {
    // Validate input
    const { error } = achievementSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const achievement = await Achievement.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    res.json(achievement)
  } catch (error) {
    console.error('Update achievement error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/achievements/:id
// @desc    Delete achievement
router.delete('/:id', checkOwnership(Achievement), async (req, res) => {
  try {
    await Achievement.findByIdAndDelete(req.params.id)
    res.json({ message: 'Achievement deleted successfully' })
  } catch (error) {
    console.error('Delete achievement error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
