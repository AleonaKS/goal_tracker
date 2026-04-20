const express = require('express')
const Joi = require('joi')
const Category = require('../models/Category')
const { auth, checkOwnership } = require('../middleware/auth')

const router = express.Router()

// All routes require authentication
router.use(auth)

// Validation schema
const categorySchema = Joi.object({
  name: Joi.string().required().max(50),
  description: Joi.string().allow('').max(200),
  icon: Joi.string().default('folder'),
  color: Joi.string().default('#3b82f6')
})

// @route   GET /api/categories
// @desc    Get all categories for logged-in user
router.get('/', async (req, res) => {
  try {
    console.log('Categories route - userId:', req.user._id.toString())
    console.log('Database name:', Category.db.name)
    console.log('Collection name:', Category.collection.name)
    
    // Try without userId filter first
    const allCategories = await Category.find({})
    console.log('All categories count:', allCategories.length)
    if (allCategories.length > 0) {
      console.log('Sample category userId:', allCategories[0].userId)
      console.log('Sample category name:', allCategories[0].name)
    }
    
    // Try with userId filter
    const userId = req.user._id.toString()
    console.log('Looking for userId:', userId)
    const categories = await Category.find({ userId })
      .sort({ createdAt: -1 })
    console.log('Found categories:', categories.length)
    
    res.json(categories)
  } catch (error) {
    console.error('Get categories error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/categories
// @desc    Create a new category
router.post('/', async (req, res) => {
  try {
    // Validate input
    const { error } = categorySchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const category = new Category({
      ...req.body,
      userId: req.user._id.toString()
    })

    await category.save()
    res.status(201).json(category)
  } catch (error) {
    console.error('Create category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/categories/:id
// @desc    Get category by ID
router.get('/:id', checkOwnership(Category), async (req, res) => {
  try {
    res.json(req.resource)
  } catch (error) {
    console.error('Get category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/categories/:id
// @desc    Update category
router.put('/:id', checkOwnership(Category), async (req, res) => {
  try {
    // Validate input
    const { error } = categorySchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    res.json(category)
  } catch (error) {
    console.error('Update category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/categories/:id
// @desc    Delete category
router.delete('/:id', checkOwnership(Category), async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id)
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
