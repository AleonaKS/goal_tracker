const jwt = require('jsonwebtoken')
const User = require('../models/User')

// Middleware to protect routes
const auth = async (req, res, next) => {
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

    req.user = user
    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(401).json({ message: 'Token is not valid' })
  }
}

// Middleware to check if user owns the resource
const checkOwnership = (resourceModel, resourceIdField = '_id') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[resourceIdField] || req.params.id
      const resource = await resourceModel.findById(resourceId)
      
      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' })
      }
      
      if (resource.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this resource' })
      }
      
      req.resource = resource
      next()
    } catch (error) {
      console.error('Ownership check error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
}

module.exports = { auth, checkOwnership }
