const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
require('dotenv').config()

// Import routes
const authRoutes = require('./routes/auth')
const categoryRoutes = require('./routes/categories')
const goalRoutes = require('./routes/goals')
const stageRoutes = require('./routes/stages')
const taskRoutes = require('./routes/tasks')
const metricRoutes = require('./routes/metrics')
const metricEntryRoutes = require('./routes/metricEntries')
const achievementRoutes = require('./routes/achievements')

const app = express()

// Middleware
app.use(helmet())
app.use(morgan('combined'))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5175',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use('/api/', limiter)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/goals', goalRoutes)
app.use('/api/stages', stageRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/metrics', metricRoutes)
app.use('/api/metric-entries', metricEntryRoutes)
app.use('/api/achievements', achievementRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goaltracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB')
  const PORT = process.env.PORT || 5000
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})
.catch((error) => {
  console.error('MongoDB connection error:', error)
  process.exit(1)
})
