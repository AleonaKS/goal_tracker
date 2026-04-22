# Vercel Deployment Guide for GoalTracker

## Quick Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the project settings

### 3. Environment Variables
Add these in Vercel dashboard:
```
NODE_ENV=production
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

## Deployment Options

### Option 1: Full Stack (Frontend + Backend)
- Uses `vercel.json` configuration
- Frontend builds to `/dist`
- Backend API routes to `/api/*`
- MongoDB required (MongoDB Atlas recommended)

### Option 2: Frontend Only (Static)
- Build and deploy only the React app
- Use mock data or external API
- No database required

### Option 3: Backend on Railway/Render + Frontend on Vercel
- Deploy backend separately (Railway, Render, Heroku)
- Deploy frontend on Vercel
- Connect via API URL

## Configuration Files Created

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "backend/package.json", 
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/backend/$1" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
```

## Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Account
- Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
- Create free cluster

### 2. Get Connection String
```
mongodb+srv://username:password@cluster.mongodb.net/goaltracker
```

### 3. Add to Vercel Environment Variables
- Variable name: `MONGODB_URI`
- Value: your connection string

## Demo URL Structure

After deployment, your app will be available at:
```
https://your-project-name.vercel.app
```

API endpoints will be at:
```
https://your-project-name.vercel.app/api/auth/login
https://your-project-name.vercel.app/api/goals
```

## Testing the Deployment

### 1. Check Frontend
- Visit your Vercel URL
- Verify the app loads correctly
- Check responsive design

### 2. Check Backend
- Test API endpoints
- Verify database connection
- Check authentication flow

### 3. Full Workflow Test
1. Register new user
2. Create a goal
3. Add tasks
4. Check analytics
5. Test gamification features

## Troubleshooting

### Common Issues
- **Build fails**: Check `npm run build` locally
- **API errors**: Verify MongoDB connection
- **CORS issues**: Check backend CORS settings
- **Environment variables**: Ensure all required vars are set

### Debug Commands
```bash
# Local build test
npm run build

# Check Vercel logs
vercel logs

# Redeploy
vercel --prod
```

## Alternative Platforms

### Netlify
- Similar to Vercel
- Good for static sites
- Requires API integration

### Railway
- Full-stack deployment
- Built-in database
- Simple configuration

### Render
- Free tier available
- Good for Node.js apps
- Automatic deployments

## Commission Demo Preparation

### 1. Pre-deployment Checklist
- [ ] All features working locally
- [ ] Build succeeds without errors
- [ ] Environment variables configured
- [ ] Database connected
- [ ] API endpoints tested

### 2. Demo Scenarios
- User registration/login
- Goal creation and management
- Task tracking
- Analytics visualization
- Gamification features

### 3. Backup Plan
- Have local demo ready
- Prepare screenshots/videos
- Document any known issues

## Cost Information

### Vercel (Free Tier)
- 100GB bandwidth/month
- 100 build hours/month
- Static hosting unlimited
- Serverless functions limited

### MongoDB Atlas (Free Tier)
- 512MB storage
- Shared cluster
- Sufficient for demo purposes

## Support Links
- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Docs](https://docs.mongodb.com/atlas)
- [React Deployment Guide](https://vercel.com/docs/frameworks/react)
