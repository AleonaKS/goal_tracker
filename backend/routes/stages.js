const express = require('express')
const Joi = require('joi')
const Stage = require('../models/Stage')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const stageSchema = Joi.object({
  name: Joi.string().required().max(100),
  goalId: Joi.string().required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required()
})

// @route   GET /api/stages
// @desc    Get all stages for logged-in user
router.get('/', async (req, res) => {
  try {
    const { goalId } = req.query
    
    const query = { userId: req.user._id.toString() }
    if (goalId) query.goalId = goalId
    
    const stages = await Stage.find(query)
      .populate('goalId', 'name')
      .sort({ startDate: 1 })
    
    res.json(stages)
  } catch (error) {
    console.error('Get stages error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/stages
// @desc    Create a new stage
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = stageSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const stage = new Stage({
      ...req.body,
      userId: req.user._id.toString()
    })

    await stage.save()
    const populatedStage = await Stage.findById(stage._id)
      .populate('goalId', 'name')
    
    res.status(201).json(populatedStage)
  } catch (error) {
    console.error('Create stage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/stages/:id
// @desc    Get stage by ID
router.get('/:id', checkOwnership(Stage), async (req, res) => {
  try {
    const stage = await Stage.findById(req.params.id)
      .populate('goalId', 'name')
      .populate('tasks')
    
    res.json(stage)
  } catch (error) {
    console.error('Get stage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/stages/:id
// @desc    Update stage
router.put('/:id', checkOwnership(Stage), async (req, res) => {
  try {
    // Validate input
    const { error } = stageSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const stage = await Stage.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('goalId', 'name')

    res.json(stage)
  } catch (error) {
    console.error('Update stage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/stages/:id
// @desc    Delete stage
router.delete('/:id', checkOwnership(Stage), async (req, res) => {
  try {
    await Stage.findByIdAndDelete(req.params.id)
    res.json({ message: 'Stage deleted successfully' })
  } catch (error) {
    console.error('Delete stage error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
