const express = require('express')
const Joi = require('joi')
const Metric = require('../models/Metric')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const metricSchema = Joi.object({
  name: Joi.string().required().max(100),
  type: Joi.string().valid('habit', 'counter').required(),
  description: Joi.string().allow('').max(500),
  goalId: Joi.string().allow(null),
  initialValue: Joi.number().default(0),
  targetValue: Joi.number().min(0).required(),
  unit: Joi.string().default('units'),
  inputMode: Joi.string().valid('fixed_step', 'manual').default('fixed_step'),
  stepValue: Joi.number().min(0.01).default(1),
  periodicity: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'every_n_days', 'weekdays').default('daily'),
  nDays: Joi.number().min(1).allow(null),
  weekdays: Joi.array().items(Joi.number().min(0).max(6)).allow(null),
  color: Joi.string().default('#3b82f6')
})

// @route   GET /api/metrics
// @desc    Get all metrics for logged-in user
router.get('/', async (req, res) => {
  try {
    const { type, goalId, search, sort = 'createdAt' } = req.query
    
    // Build query
    const query = { userId: req.user._id.toString() }
    
    if (type) query.type = type
    if (goalId) query.goalId = goalId
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    // Sort options
    let sortOptions = {}
    switch (sort) {
      case 'name':
        sortOptions.name = 1
        break
      default:
        sortOptions.createdAt = -1
    }
    
    const metrics = await Metric.find(query)
      .populate('goalId', 'name')
      .sort(sortOptions)
    
    res.json(metrics)
  } catch (error) {
    console.error('Get metrics error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/metrics
// @desc    Create a new metric
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = metricSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const metric = new Metric({
      ...req.body,
      userId: req.user._id.toString()
    })

    await metric.save()
    const populatedMetric = await Metric.findById(metric._id)
      .populate('goalId', 'name')
    
    res.status(201).json(populatedMetric)
  } catch (error) {
    console.error('Create metric error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/metrics/:id
// @desc    Get metric by ID
router.get('/:id', checkOwnership(Metric), async (req, res) => {
  try {
    const metric = await Metric.findById(req.params.id)
      .populate('goalId', 'name')
      .populate({
        path: 'entries',
        sort: { timestamp: -1 },
        limit: 100
      })
    
    res.json(metric)
  } catch (error) {
    console.error('Get metric error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/metrics/:id
// @desc    Update metric
router.put('/:id', checkOwnership(Metric), async (req, res) => {
  try {
    // Validate input
    const { error } = metricSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const metric = await Metric.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('goalId', 'name')

    res.json(metric)
  } catch (error) {
    console.error('Update metric error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/metrics/:id
// @desc    Delete metric
router.delete('/:id', checkOwnership(Metric), async (req, res) => {
  try {
    await Metric.findByIdAndDelete(req.params.id)
    res.json({ message: 'Metric deleted successfully' })
  } catch (error) {
    console.error('Delete metric error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
