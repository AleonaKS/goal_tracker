const express = require('express')
const Joi = require('joi')
const MetricEntry = require('../models/MetricEntry')
const Metric = require('../models/Metric')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const metricEntrySchema = Joi.object({
  metricId: Joi.string().required(),
  value: Joi.number().required(),
  finalValue: Joi.number().allow(null),
  note: Joi.string().allow('').max(500),
  timestamp: Joi.date().default(Date.now),
  isAddition: Joi.boolean().default(true)
})

// @route   GET /api/metric-entries
// @desc    Get all metric entries for logged-in user
router.get('/', async (req, res) => {
  try {
    const { metricId, startDate, endDate, limit = 100 } = req.query
    
    // Build query
    const query = { userId: req.user._id.toString() }
    
    if (metricId) query.metricId = metricId
    if (startDate) query.timestamp = { $gte: new Date(startDate) }
    if (endDate) {
      query.timestamp = query.timestamp || {}
      query.timestamp.$lte = new Date(endDate)
    }
    
    const entries = await MetricEntry.find(query)
      .populate('metricId', 'name type unit')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
    
    res.json(entries)
  } catch (error) {
    console.error('Get metric entries error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/metric-entries
// @desc    Create a new metric entry
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = metricEntrySchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    // Verify user owns the metric
    const metric = await Metric.findOne({ 
      _id: req.body.metricId, 
      userId: req.user._id.toString() 
    })
    
    if (!metric) {
      return res.status(404).json({ message: 'Metric not found' })
    }

    const entry = new MetricEntry({
      ...req.body,
      userId: req.user._id.toString()
    })

    await entry.save()
    const populatedEntry = await MetricEntry.findById(entry._id)
      .populate('metricId', 'name type unit')
    
    res.status(201).json(populatedEntry)
  } catch (error) {
    console.error('Create metric entry error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/metric-entries/:id
// @desc    Get metric entry by ID
router.get('/:id', checkOwnership(MetricEntry), async (req, res) => {
  try {
    const entry = await MetricEntry.findById(req.params.id)
      .populate('metricId', 'name type unit')
    
    res.json(entry)
  } catch (error) {
    console.error('Get metric entry error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/metric-entries/:id
// @desc    Update metric entry
router.put('/:id', checkOwnership(MetricEntry), async (req, res) => {
  try {
    // Validate input
    const { error } = metricEntrySchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const entry = await MetricEntry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('metricId', 'name type unit')

    res.json(entry)
  } catch (error) {
    console.error('Update metric entry error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/metric-entries/:id
// @desc    Delete metric entry
router.delete('/:id', checkOwnership(MetricEntry), async (req, res) => {
  try {
    await MetricEntry.findByIdAndDelete(req.params.id)
    res.json({ message: 'Metric entry deleted successfully' })
  } catch (error) {
    console.error('Delete metric entry error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
