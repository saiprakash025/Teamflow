// server/src/index.js

require('dotenv').config(); // Load .env variables

const express = require('express');
const cors = require('cors');
const path = require('path');

const { connectDB } = require('./utils/db');
const User = require('./models/User');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const rcaRouter = require('./routes/rca');
const analyticsRouter = require('./routes/analytics');
const usersRouter = require('./routes/users');
const uploadsRouter = require('./routes/uploads');

const notificationsRouter = require('./routes/notifications');
const projectTaskLinksRouter = require('./routes/projectTaskLinks');
const activityRoutes = require('./routes/activity')
const preferencesRouter = require('./routes/preferences');

const app = express();

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name email role emailOptOut');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailOptOut: user.emailOptOut,
      },
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/rca', rcaRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/project-task-links', projectTaskLinksRouter);

app.use('/api/activity', activityRoutes);
app.use('/api/preferences', preferencesRouter);
app.use('/api/users', usersRouter);
app.use('/api/uploads', uploadsRouter);





app.listen(PORT, () => {
  console.log(` Server listening on port ${PORT}`);
});