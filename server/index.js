const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const users = new Map();
const bookmarks = new Map();
const notifications = new Map();

// Create admin user
const ADMIN_EMAIL = 'ashwinoffcl09@gmail.com';
const ADMIN_PASSWORD = '120120120';

const createAdminUser = async () => {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const adminId = 'admin-' + uuidv4();
  
  users.set(adminId, {
    id: adminId,
    name: 'Ashwin Admin',
    email: ADMIN_EMAIL,
    password: hashedPassword,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Ashwin&backgroundColor=e5e7eb`,
    isAdmin: true,
    createdAt: new Date().toISOString(),
    authProvider: 'email'
  });
  
  console.log('✅ Admin user created:', ADMIN_EMAIL);
};

createAdminUser();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.user = users.get(decoded.userId);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = 'user-' + uuidv4();

    const newUser = {
      id: userId,
      name,
      email,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}&backgroundColor=e5e7eb`,
      isAdmin: false,
      createdAt: new Date().toISOString(),
      authProvider: 'email'
    };

    users.set(userId, newUser);

    // Create welcome notification
    const welcomeNotification = {
      id: uuidv4(),
      userId: userId,
      type: 'system',
      title: 'Welcome to SmartMark!',
      message: 'Your account has been created successfully. Start adding your favorite bookmarks.',
      createdAt: new Date().toISOString(),
      read: false,
      icon: 'check-circle',
      color: 'green'
    };
    notifications.set(welcomeNotification.id, welcomeNotification);

    const token = generateToken(userId);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        isAdmin: newUser.isAdmin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Please use Google login' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, googleId } = req.body;
    
    let user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      const userId = 'user-' + uuidv4();
      user = {
        id: userId,
        name: name || 'Google User',
        email: email || `user-${Date.now()}@gmail.com`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || Date.now()}&backgroundColor=e5e7eb`,
        isAdmin: false,
        createdAt: new Date().toISOString(),
        authProvider: 'google',
        googleId: googleId || 'simulated'
      };
      users.set(userId, user);

      const welcomeNotification = {
        id: uuidv4(),
        userId: userId,
        type: 'system',
        title: 'Welcome to SmartMark!',
        message: 'Your Google account has been connected successfully.',
        createdAt: new Date().toISOString(),
        read: false,
        icon: 'check-circle',
        color: 'green'
      };
      notifications.set(welcomeNotification.id, welcomeNotification);
    }

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Google login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.get(req.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isAdmin: user.isAdmin
    }
  });
});

// Bookmark Routes - FIXED
app.get('/api/bookmarks', authenticateToken, (req, res) => {
  const userBookmarks = Array.from(bookmarks.values())
    .filter(bm => bm.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ bookmarks: userBookmarks });
});

app.post('/api/bookmarks', authenticateToken, async (req, res) => {
  try {
    const { title, url, domain, date, isFuture } = req.body;
    
    const now = new Date().toISOString();
    const bookmark = {
      id: uuidv4(),
      userId: req.userId,
      title,
      url,
      domain,
      createdAt: isFuture ? now : (date ? new Date(date).toISOString() : now),
      isFuture: isFuture || false,
      scheduledDate: isFuture && date ? new Date(date).toISOString() : null
    };
    
    bookmarks.set(bookmark.id, bookmark);
    
    // Create notification for future bookmarks
    if (isFuture && date) {
      const notification = {
        id: uuidv4(),
        userId: req.userId,
        type: 'reminder',
        title: 'Future bookmark scheduled',
        message: `"${title}" has been scheduled for ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        createdAt: now,
        read: false,
        icon: 'calendar-clock',
        color: 'amber'
      };
      notifications.set(notification.id, notification);
    }
    
    // Return the created bookmark
    res.status(201).json({ bookmark });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create bookmark' });
  }
});

app.delete('/api/bookmarks/:id', authenticateToken, (req, res) => {
  const bookmark = bookmarks.get(req.params.id);
  
  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  
  if (bookmark.userId !== req.userId && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  bookmarks.delete(req.params.id);
  res.json({ message: 'Bookmark deleted' });
});

// Notification Routes
app.get('/api/notifications', authenticateToken, (req, res) => {
  const userNotifications = Array.from(notifications.values())
    .filter(n => n.userId === req.userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ notifications: userNotifications });
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notification = notifications.get(req.params.id);
  
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  if (notification.userId !== req.userId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  notification.read = true;
  notifications.set(req.params.id, notification);
  
  res.json({ notification });
});

app.put('/api/notifications/read-all', authenticateToken, (req, res) => {
  Array.from(notifications.values())
    .filter(n => n.userId === req.userId && !n.read)
    .forEach(n => {
      n.read = true;
      notifications.set(n.id, n);
    });
  
  res.json({ message: 'All notifications marked as read' });
});

// Admin Routes
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const allUsers = Array.from(users.values());
  const allBookmarks = Array.from(bookmarks.values());
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= today).length;
  const newBookmarksToday = allBookmarks.filter(b => new Date(b.createdAt) >= today).length;
  
  res.json({
    totalUsers: allUsers.length,
    totalBookmarks: allBookmarks.length,
    futureBookmarks: allBookmarks.filter(b => b.isFuture).length,
    newUsersToday,
    newBookmarksToday,
    avgBookmarksPerUser: allUsers.length > 0 ? (allBookmarks.length / allUsers.length).toFixed(1) : 0
  });
});

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const allUsers = Array.from(users.values()).map(u => {
    const userBookmarks = Array.from(bookmarks.values()).filter(b => b.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      bookmarkCount: userBookmarks.length,
      authProvider: u.authProvider
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ users: allUsers });
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const userToDelete = users.get(req.params.id);
  
  if (!userToDelete) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (userToDelete.isAdmin) {
    return res.status(403).json({ error: 'Cannot delete admin user' });
  }
  
  // Delete user's bookmarks
  Array.from(bookmarks.values())
    .filter(b => b.userId === req.params.id)
    .forEach(b => bookmarks.delete(b.id));
  
  // Delete user's notifications
  Array.from(notifications.values())
    .filter(n => n.userId === req.params.id)
    .forEach(n => notifications.delete(n.id));
  
  users.delete(req.params.id);
  
  res.json({ message: 'User deleted' });
});

// User Stats Route - Add this before error handling
app.get('/api/user/stats', authenticateToken, (req, res) => {
  const userBookmarks = Array.from(bookmarks.values())
    .filter(bm => bm.userId === req.userId);
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const userNotifications = Array.from(notifications.values())
    .filter(n => n.userId === req.userId);
  
  res.json({
    totalBookmarks: userBookmarks.length,
    futureBookmarks: userBookmarks.filter(b => b.isFuture && new Date(b.scheduledDate) > now).length,
    todayBookmarks: userBookmarks.filter(b => {
      const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
      return date.toDateString() === today.toDateString();
    }).length,
    thisWeekBookmarks: userBookmarks.filter(b => {
      const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
      return date >= weekStart && date <= weekEnd;
    }).length,
    unreadNotifications: userNotifications.filter(n => !n.read).length
  });
});


// Edit (Update) Bookmark - Add this with other bookmark routes
app.put('/api/bookmarks/:id', authenticateToken, async (req, res) => {
  try {
    const bookmark = bookmarks.get(req.params.id);
    
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    
    if (bookmark.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const { title, url, domain, date, isFuture } = req.body;
    
    // Update bookmark
    bookmark.title = title;
    bookmark.url = url;
    bookmark.domain = domain;
    bookmark.isFuture = isFuture || false;
    
    if (isFuture && date) {
      bookmark.scheduledDate = new Date(date).toISOString();
    } else {
      bookmark.createdAt = date ? new Date(date).toISOString() : bookmark.createdAt;
      bookmark.scheduledDate = null;
    }
    
    bookmarks.set(req.params.id, bookmark);
    
    res.json({ bookmark });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

app.get('/api/admin/bookmarks', authenticateToken, requireAdmin, (req, res) => {
  const allBookmarks = Array.from(bookmarks.values()).map(bm => {
    const user = users.get(bm.userId);
    return {
      ...bm,
      userName: user ? user.name : 'Unknown',
      userEmail: user ? user.email : 'unknown@email.com'
    };
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  res.json({ bookmarks: allBookmarks });
});

app.delete('/api/admin/bookmarks/:id', authenticateToken, requireAdmin, (req, res) => {
  const bookmark = bookmarks.get(req.params.id);
  
  if (!bookmark) {
    return res.status(404).json({ error: 'Bookmark not found' });
  }
  
  bookmarks.delete(req.params.id);
  res.json({ message: 'Bookmark deleted' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    stats: {
      users: users.size,
      bookmarks: bookmarks.size,
      notifications: notifications.size
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 SmartMark Server running on http://localhost:${PORT}

📊 Admin Credentials:
   Email:    ${ADMIN_EMAIL}
   Password: ${ADMIN_PASSWORD}

📋 API Endpoints available
  `);
});

module.exports = app;