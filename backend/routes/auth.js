const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Joi = require('joi')
const User = require('../models/User')

const router = express.Router()

// Validation schemas
const registerSchema = Joi.object({
  login: Joi.string().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

// @route   POST /api/auth/register
// @desc    Register a user
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const { login, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { login }]
    })

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or login already exists' 
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = new User({
      login,
      email,
      password: hashedPassword
    })

    await user.save()

    // Create JWT token
    const payload = {
      id: user._id,
      email: user.email
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE },
      (err, token) => {
        if (err) throw err
        res.json({
          token,
          user: {
            _id: user._id,
            login: user.login,
            email: user.email,
            registrationDate: user.registrationDate,
            settings: user.settings
          }
        })
      }
    )
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body)
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    const { email, password } = req.body

    // Check for user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Create JWT token
    const payload = {
      id: user._id,
      email: user.email
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE },
      (err, token) => {
        if (err) throw err
        res.json({
          token,
          user: {
            _id: user._id,
            login: user.login,
            email: user.email,
            registrationDate: user.registrationDate,
            settings: user.settings
          }
        })
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select('-password')
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' })
    }

    res.json(user)
  } catch (error) {
    console.error('Get user error:', error)
    res.status(401).json({ message: 'Token is not valid' })
  }
})

module.exports = router
