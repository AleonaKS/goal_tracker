# GoalTracker Backend API

Backend server for GoalTracker application built with Node.js, Express, and MongoDB.

## Features

- JWT Authentication
- RESTful API for all entities
- MongoDB with Mongoose ODM
- Input validation with Joi
- Rate limiting
- CORS support
- Error handling
- Security headers with Helmet

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/goaltracker
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5175
```

3. Make sure MongoDB is running on your system.

4. Seed the database with sample data:
```bash
npm run seed
```

5. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category by ID
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Goals
- `GET /api/goals` - Get all goals (supports filtering)
- `POST /api/goals` - Create goal
- `GET /api/goals/:id` - Get goal by ID
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Stages
- `GET /api/stages` - Get all stages
- `POST /api/stages` - Create stage
- `GET /api/stages/:id` - Get stage by ID
- `PUT /api/stages/:id` - Update stage
- `DELETE /api/stages/:id` - Delete stage

### Tasks
- `GET /api/tasks` - Get all tasks (supports filtering)
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task by ID
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Metrics
- `GET /api/metrics` - Get all metrics (supports filtering)
- `POST /api/metrics` - Create metric
- `GET /api/metrics/:id` - Get metric by ID
- `PUT /api/metrics/:id` - Update metric
- `DELETE /api/metrics/:id` - Delete metric

### Metric Entries
- `GET /api/metric-entries` - Get all metric entries
- `POST /api/metric-entries` - Create metric entry
- `GET /api/metric-entries/:id` - Get metric entry by ID
- `PUT /api/metric-entries/:id` - Update metric entry
- `DELETE /api/metric-entries/:id` - Delete metric entry

### Achievements
- `GET /api/achievements` - Get all achievements
- `POST /api/achievements` - Create achievement
- `GET /api/achievements/:id` - Get achievement by ID
- `PUT /api/achievements/:id` - Update achievement
- `DELETE /api/achievements/:id` - Delete achievement

## Authentication

All routes (except auth routes) require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Data Models

### User
- login (string)
- email (string)
- password (hashed)
- registrationDate (date)
- settings (object)

### Category
- name (string)
- description (string)
- icon (string)
- color (string)
- isDefault (boolean)
- userId (ObjectId)

### Goal
- name (string)
- categoryId (ObjectId)
- description (string)
- startDate (date)
- deadlineType (enum)
- deadlineValue (mixed)
- status (enum)
- priority (number)
- progressCalculation (enum)
- progressMetricId (ObjectId)
- userId (ObjectId)

### Stage
- name (string)
- goalId (ObjectId)
- startDate (date)
- endDate (date)
- userId (ObjectId)

### Task
- name (string)
- goalId (ObjectId)
- stageId (ObjectId)
- categoryId (ObjectId)
- startDate (date)
- dueDate (date)
- isPeriodBased (boolean)
- priority (number)
- complexity (number)
- weight (number)
- completed (boolean)
- subtasks (array)
- userId (ObjectId)

### Metric
- name (string)
- type (enum: habit/counter)
- description (string)
- goalId (ObjectId)
- initialValue (number)
- targetValue (number)
- unit (string)
- inputMode (enum)
- stepValue (number)
- periodicity (enum)
- nDays (number)
- weekdays (array)
- color (string)
- userId (ObjectId)

### MetricEntry
- metricId (ObjectId)
- value (number)
- finalValue (number)
- note (string)
- timestamp (date)
- isAddition (boolean)
- userId (ObjectId)

### Achievement
- type (enum)
- title (string)
- description (string)
- value (number)
- date (date)
- userId (ObjectId)

## Error Responses

All errors return JSON with:
```json
{
  "message": "Error description",
  "error": {} // Additional error details in development
}
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Security headers with Helmet
- Input validation with Joi
- User ownership verification for all resources

## Development

The server runs on port 5000 by default. Make sure your frontend is configured to connect to this URL.

## Demo User

After running the seed script, you can login with:
- Email: demo@example.com
- Password: demo123
