const express = require('express')
const Joi = require('joi')
const Task = require('../models/Task')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const taskSchema = Joi.object({
  name: Joi.string().required().max(100),
  goalId: Joi.string().required(),
  stageId: Joi.string().allow(null),
  categoryId: Joi.string().required(),
  startDate: Joi.date().allow(null),
  dueDate: Joi.date().allow(null),
  isPeriodBased: Joi.boolean().default(false),
  priority: Joi.number().min(1).max(5).default(3),
  complexity: Joi.number().min(1).max(5).default(3),
  weight: Joi.number().min(1).max(10).default(5),
  completed: Joi.boolean().default(false),
  subtasks: Joi.array().items(Joi.object({
    name: Joi.string().required().max(100),
    completed: Joi.boolean().default(false)
  })).default([])
})

// @route   GET /api/tasks
// @desc    Get all tasks for logged-in user
router.get('/', async (req, res) => {
  try {
    const { goalId, stageId, categoryId, completed, search, sort = 'createdAt' } = req.query
    
    // Build query
    const query = { userId: req.user._id.toString() }
    
    if (goalId) query.goalId = goalId
    if (stageId) query.stageId = stageId
    if (categoryId) query.categoryId = categoryId
    if (completed !== undefined) query.completed = completed === 'true'
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } }
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
      case 'dueDate':
        sortOptions.dueDate = 1
        break
      default:
        sortOptions.createdAt = -1
    }
    
    const tasks = await Task.find(query)
      .populate('goalId', 'name')
      .populate('stageId', 'name')
      .populate('categoryId', 'name color')
      .sort(sortOptions)
    
    res.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/tasks
// @desc    Create a new task
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = taskSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const task = new Task({
      ...req.body,
      userId: req.user._id.toString()
    })

    await task.save()
    const populatedTask = await Task.findById(task._id)
      .populate('goalId', 'name')
      .populate('stageId', 'name')
      .populate('categoryId', 'name color')
    
    res.status(201).json(populatedTask)
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/tasks/:id
// @desc    Get task by ID
router.get('/:id', checkOwnership(Task), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('goalId', 'name')
      .populate('stageId', 'name')
      .populate('categoryId', 'name color')
    
    res.json(task)
  } catch (error) {
    console.error('Get task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/tasks/:id
// @desc    Update task
router.put('/:id', checkOwnership(Task), async (req, res) => {
  try {
    // Validate input
    const { error } = taskSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('goalId', 'name')
      .populate('stageId', 'name')
      .populate('categoryId', 'name color')

    res.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/tasks/:id
// @desc    Delete task
router.delete('/:id', checkOwnership(Task), async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id)
    res.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
