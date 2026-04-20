const express = require('express')
const Joi = require('joi')
const Goal = require('../models/Goal')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const goalSchema = Joi.object({
  name: Joi.string().required().max(100),
  categoryId: Joi.string().required(),
  description: Joi.string().allow('').max(500),
  startDate: Joi.date().default(Date.now),
  deadlineType: Joi.string().valid('none', 'specific_date', 'month_year', 'year').default('none'),
  deadlineValue: Joi.any().allow(null),
  status: Joi.string().valid('in_progress', 'completed', 'overdue', 'planned', 'frozen').default('in_progress'),
  priority: Joi.number().min(1).max(5).default(3),
  progressCalculation: Joi.string().valid('by_tasks', 'by_metric').default('by_tasks'),
  progressMetricId: Joi.string().allow(null)
})

// @route   GET /api/goals
// @desc    Get all goals for logged-in user
router.get('/', async (req, res) => {
  try {
    const { category, status, priority, search, sort = 'createdAt' } = req.query
    
    // Build query
    const query = { userId: req.user._id.toString() }
    
    if (category) query.categoryId = category
    if (status) query.status = status
    if (priority) query.priority = priority
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
      case 'priority':
        sortOptions.priority = -1
        break
      case 'deadline':
        sortOptions.deadlineValue = 1
        break
      default:
        sortOptions.createdAt = -1
    }
    
    const goals = await Goal.find(query)
      .populate('categoryId', 'name color')
      .populate('progressMetricId', 'name type')
      .sort(sortOptions)
    
    res.json(goals)
  } catch (error) {
    console.error('Get goals error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/goals
// @desc    Create a new goal
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = goalSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const goal = new Goal({
      ...req.body,
      userId: req.user._id.toString()
    })

    await goal.save()
    const populatedGoal = await Goal.findById(goal._id)
      .populate('categoryId', 'name color')
      .populate('progressMetricId', 'name type')
    
    res.status(201).json(populatedGoal)
  } catch (error) {
    console.error('Create goal error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/goals/:id
// @desc    Get goal by ID
router.get('/:id', checkOwnership(Goal), async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id)
      .populate('categoryId', 'name color')
      .populate('progressMetricId', 'name type')
      .populate({
        path: 'tasks',
        populate: { path: 'categoryId', select: 'name color' }
      })
      .populate('stages')
      .populate('metrics')
    
    res.json(goal)
  } catch (error) {
    console.error('Get goal error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/goals/:id
// @desc    Update goal
router.put('/:id', checkOwnership(Goal), async (req, res) => {
  try {
    // Validate input
    const { error } = goalSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const goal = await Goal.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('categoryId', 'name color')
      .populate('progressMetricId', 'name type')

    res.json(goal)
  } catch (error) {
    console.error('Update goal error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/goals/:id
// @desc    Delete goal
router.delete('/:id', checkOwnership(Goal), async (req, res) => {
  try {
    await Goal.findByIdAndDelete(req.params.id)
    res.json({ message: 'Goal deleted successfully' })
  } catch (error) {
    console.error('Delete goal error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
