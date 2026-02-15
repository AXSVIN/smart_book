import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bookmark, 
  Library, 
  Link, 
  Edit3, 
  Calendar, 
  Clock, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  Trash2, 
  LogOut, 
  Bell, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Smartphone, 
  Users, 
  RefreshCw,
  Globe,
  Inbox,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  BarChart3,
  Database,
  Settings,
  Search,
  Filter,
  ChevronDown,
  Menu,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  CalendarDays,
  AlarmClock,
  Volume2,
  VolumeX,
  Save
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const App = () => {
  // Auth State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Bookmark State
  const [bookmarks, setBookmarks] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [isFuture, setIsFuture] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(null);
  const [addingBookmark, setAddingBookmark] = useState(false);

  // Edit State
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editIsFuture, setEditIsFuture] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Notification & Alarm State
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [showAlarmDialog, setShowAlarmDialog] = useState(false);
  const [alarmSound, setAlarmSound] = useState(true);
  const [newAlarmTime, setNewAlarmTime] = useState('');
  const [newAlarmMessage, setNewAlarmMessage] = useState('');

  // Admin State
  const [adminView, setAdminView] = useState('dashboard');
  const [allUsers, setAllUsers] = useState([]);
  const [allBookmarks, setAllBookmarks] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast State
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Audio ref for alarm
  const audioRef = React.useRef(null);

  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    }
    
    // Load alarms from localStorage
    const savedAlarms = localStorage.getItem('smartmark_alarms');
    if (savedAlarms) {
      setAlarms(JSON.parse(savedAlarms));
    }
    
    // Load alarm sound preference
    const soundPref = localStorage.getItem('smartmark_alarm_sound');
    if (soundPref !== null) {
      setAlarmSound(soundPref === 'true');
    }
  }, []);

  // Alarm checker interval
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const interval = setInterval(() => {
      checkAlarms();
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [isLoggedIn, alarms, alarmSound]);

  // Fetch data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      if (isAdmin) {
        fetchAdminData();
      } else {
        fetchBookmarks();
        fetchNotifications();
      }
    }
  }, [isLoggedIn, isAdmin]);

  // API Functions
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsAdmin(data.user.isAdmin);
        setIsLoggedIn(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookmarks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setBookmarks(Array.isArray(data.bookmarks) ? data.bookmarks : []);
    } catch (err) {
      showToast('Failed to load bookmarks', 'error');
      setBookmarks([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
    } catch (err) {
      console.error(err);
      setNotifications([]);
    }
  };

  // Admin API Functions
  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [statsRes, usersRes, bookmarksRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/bookmarks`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();
      const bookmarksData = await bookmarksRes.json();

      setAdminStats(statsData);
      setAllUsers(Array.isArray(usersData.users) ? usersData.users : []);
      setAllBookmarks(Array.isArray(bookmarksData.bookmarks) ? bookmarksData.bookmarks : []);
    } catch (err) {
      showToast('Failed to load admin data', 'error');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user? All their data will be removed.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setAllUsers(prev => prev.filter(u => u.id !== userId));
        showToast('User deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      showToast('Failed to delete user', 'error');
    }
  };

  const deleteAnyBookmark = async (bookmarkId) => {
    if (!window.confirm('Delete this bookmark?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/admin/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setAllBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
        showToast('Bookmark deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      showToast('Failed to delete bookmark', 'error');
    }
  };

  // Alarm Functions
  const checkAlarms = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    alarms.forEach(alarm => {
      if (alarm.enabled && alarm.time === currentTime && !alarm.triggeredToday) {
        triggerAlarm(alarm);
      }
    });
  };

  const triggerAlarm = (alarm) => {
    // Play sound if enabled
    if (alarmSound && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    }
    
    // Show notification
    showToast(`🔔 Alarm: ${alarm.message || 'Time is up!'}`, 'success');
    
    // Add to notifications
    const newNotification = {
      id: Date.now().toString(),
      userId: user?.id,
      type: 'alarm',
      title: 'Alarm',
      message: alarm.message || 'Your alarm is ringing!',
      createdAt: new Date().toISOString(),
      read: false,
      icon: 'alarm-clock',
      color: 'red'
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Mark as triggered today
    const today = new Date().toDateString();
    setAlarms(prev => prev.map(a => 
      a.id === alarm.id ? { ...a, triggeredToday: today } : a
    ));
  };

  const addAlarm = () => {
    if (!newAlarmTime) {
      showToast('Please set alarm time', 'error');
      return;
    }
    
    const alarm = {
      id: Date.now().toString(),
      time: newAlarmTime,
      message: newAlarmMessage || 'Alarm',
      enabled: true,
      createdAt: new Date().toISOString()
    };
    
    const updatedAlarms = [...alarms, alarm];
    setAlarms(updatedAlarms);
    localStorage.setItem('smartmark_alarms', JSON.stringify(updatedAlarms));
    
    setNewAlarmTime('');
    setNewAlarmMessage('');
    showToast('Alarm set successfully');
  };

  const toggleAlarm = (id) => {
    const updatedAlarms = alarms.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    setAlarms(updatedAlarms);
    localStorage.setItem('smartmark_alarms', JSON.stringify(updatedAlarms));
  };

  const deleteAlarm = (id) => {
    const updatedAlarms = alarms.filter(a => a.id !== id);
    setAlarms(updatedAlarms);
    localStorage.setItem('smartmark_alarms', JSON.stringify(updatedAlarms));
    showToast('Alarm deleted');
  };

  const toggleAlarmSound = () => {
    const newValue = !alarmSound;
    setAlarmSound(newValue);
    localStorage.setItem('smartmark_alarm_sound', newValue.toString());
  };

  // Auth Functions
  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsAdmin(data.user.isAdmin);
      setIsLoggedIn(true);
      showToast('Welcome back!');
    } catch (err) {
      setAuthError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const register = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsAdmin(data.user.isAdmin);
      setIsLoggedIn(true);
      showToast('Account created successfully!');
    } catch (err) {
      setAuthError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/google`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `user${Date.now()}@gmail.com`,
          name: 'Google User',
          googleId: 'simulated'
        })
      });
      const data = await res.json();
      
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setIsAdmin(data.user.isAdmin);
      setIsLoggedIn(true);
      showToast('Welcome!');
    } catch (err) {
      showToast('Google login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsAdmin(false);
    setUser(null);
    setBookmarks([]);
    setNotifications([]);
    setAlarms([]);
    setAllUsers([]);
    setAllBookmarks([]);
    setAdminStats(null);
    setEmail('');
    setPassword('');
    setName('');
    setAuthView('login');
  };

  // Bookmark Functions
  const addBookmark = async () => {
    if (!urlInput.trim()) {
      showToast('Please enter a URL', 'error');
      return;
    }

    setAddingBookmark(true);

    let formattedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    let domain = '';
    try {
      domain = new URL(formattedUrl).hostname.replace('www.', '');
    } catch (e) {
      domain = 'unknown';
    }

    const title = titleInput.trim() || domain;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          url: formattedUrl,
          domain,
          date: dateInput,
          isFuture
        })
      });

      if (!res.ok) {
        throw new Error('Failed to add bookmark');
      }

      const data = await res.json();
      
      setBookmarks(prev => [data.bookmark, ...prev]);
      
      await fetchNotifications();
      
      setUrlInput('');
      setTitleInput('');
      setIsFuture(false);
      setDateInput(new Date().toISOString().split('T')[0]);
      
      showToast(isFuture ? 'Future bookmark scheduled' : 'Bookmark added');
    } catch (err) {
      showToast('Failed to add bookmark', 'error');
      console.error(err);
    } finally {
      setAddingBookmark(false);
    }
  };

  // EDIT BOOKMARK FUNCTION
  const startEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditDate(bookmark.isFuture && bookmark.scheduledDate 
      ? new Date(bookmark.scheduledDate).toISOString().split('T')[0]
      : new Date(bookmark.createdAt).toISOString().split('T')[0]
    );
    setEditIsFuture(bookmark.isFuture);
  };

  const saveEditBookmark = async () => {
    if (!editingBookmark) return;
    
    if (!editUrl.trim()) {
      showToast('Please enter a URL', 'error');
      return;
    }

    let formattedUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    let domain = '';
    try {
      domain = new URL(formattedUrl).hostname.replace('www.', '');
    } catch (e) {
      domain = 'unknown';
    }

    const title = editTitle.trim() || domain;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookmarks/${editingBookmark.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          url: formattedUrl,
          domain,
          date: editDate,
          isFuture: editIsFuture
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update bookmark');
      }

      const data = await res.json();
      
      // Update bookmarks state with edited bookmark
      setBookmarks(prev => prev.map(bm => 
        bm.id === editingBookmark.id ? data.bookmark : bm
      ));
      
      setEditingBookmark(null);
      setEditTitle('');
      setEditUrl('');
      setEditDate('');
      setEditIsFuture(false);
      
      showToast('Bookmark updated successfully');
    } catch (err) {
      showToast('Failed to update bookmark', 'error');
      console.error(err);
    }
  };

  const cancelEdit = () => {
    setEditingBookmark(null);
    setEditTitle('');
    setEditUrl('');
    setEditDate('');
    setEditIsFuture(false);
  };

  const deleteBookmark = async (id) => {
    if (!window.confirm('Delete this bookmark?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/bookmarks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.id !== id));
        showToast('Bookmark deleted');
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      showToast('Failed to delete bookmark', 'error');
    }
  };

  // Notification Functions
  const markNotificationRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      showToast('All notifications marked as read');
    } catch (err) {
      showToast('Failed to mark notifications as read', 'error');
    }
  };

  // Helper Functions
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const getFilteredBookmarks = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (currentFilter) {
      case 'today':
        return bookmarks.filter(b => {
          const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
          return date.toDateString() === today.toDateString();
        });
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return bookmarks.filter(b => {
          const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
          return date >= weekStart && date <= weekEnd;
        });
      case 'month':
        return bookmarks.filter(b => {
          const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
          return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        });
      case 'future':
        return bookmarks.filter(b => b.isFuture && new Date(b.scheduledDate) > now);
      case 'date':
        if (!selectedDate) return bookmarks;
        return bookmarks.filter(b => {
          const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
          return date.toDateString() === selectedDate.toDateString();
        });
      default:
        return bookmarks;
    }
  }, [bookmarks, currentFilter, selectedDate]);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Calendar Render
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="calendar-day other-month text-gray-300">
          {daysInPrevMonth - i}
        </div>
      );
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const hasBookmark = bookmarks.some(b => {
        const bDate = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
        return bDate.toDateString() === date.toDateString();
      });
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

      days.push(
        <div
          key={`current-${day}`}
          className={`calendar-day ${isToday ? 'today border-2 border-gray-900 font-semibold' : ''} ${hasBookmark ? 'has-bookmark' : ''} ${isSelected ? 'selected bg-gray-900 text-white' : 'hover:bg-gray-100'}`}
          onClick={() => {
            setSelectedDate(date);
            setCurrentFilter('date');
          }}
        >
          {day}
          {hasBookmark && <span className="absolute bottom-1 w-1 h-1 bg-green-500 rounded-full"></span>}
        </div>
      );
    }

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remaining = totalCells - (firstDay + daysInMonth);
    for (let day = 1; day <= remaining; day++) {
      days.push(
        <div key={`next-${day}`} className="calendar-day other-month text-gray-300">
          {day}
        </div>
      );
    }

    return days;
  };

  // Styles
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * { font-family: 'Inter', sans-serif; }
    
    .bg-gradient {
      background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 50%, #f0f0f0 100%);
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      z-index: -1;
    }
    .bg-pattern {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      z-index: -1;
      opacity: 0.4;
      background-image: radial-gradient(#e5e5e5 1px, transparent 1px);
      background-size: 24px 24px;
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 10px 30px -10px rgba(0,0,0,0.08);
    }
    .bookmark-item {
      transition: all 0.2s ease;
    }
    .bookmark-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.1);
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slideUp 0.5s ease-out forwards;
    }
    @keyframes pulse-soft {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-pulse-soft {
      animation: pulse-soft 2s ease-in-out infinite;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }
    .calendar-day {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }
    .dialog-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .dialog-box {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.95);
      z-index: 101;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      max-width: 480px;
      width: 90%;
    }
    .dialog-box.active {
      opacity: 1;
      visibility: visible;
      transform: translate(-50%, -50%) scale(1);
    }
    .notification-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 18px;
      height: 18px;
      background: #ef4444;
      color: white;
      border-radius: 50%;
      font-size: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }
    .admin-sidebar {
      width: 260px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-right: 1px solid rgba(0,0,0,0.05);
    }
    .alarm-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background: #f59e0b;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
  `;

  // Auth Views
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col relative">
        <style>{styles}</style>
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
        
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="glass-card p-8 sm:p-12 rounded-3xl max-w-md w-full animate-slide-up">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bookmark className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">SmartMark</h1>
              <p className="text-gray-500 text-sm mt-1">Your personal bookmark library</p>
            </div>

            {authView === 'login' ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Welcome back</h2>
                
                {authError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <form onSubmit={login} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={googleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setAuthView('register'); setAuthError(''); }}
                    className="text-gray-900 font-semibold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">Create account</h2>
                
                {authError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <form onSubmit={register} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 6 characters)"
                      className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      minLength="6"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                  </div>
                </div>

                <button
                  onClick={googleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>

                <p className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    onClick={() => { setAuthView('login'); setAuthError(''); }}
                    className="text-gray-900 font-semibold hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard (unchanged)
  if (isAdmin) {
    // ... (keep admin code same as before)
    const filteredUsers = allUsers.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAllBookmarks = allBookmarks.filter(b =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="min-h-screen flex relative">
        <style>{styles}</style>
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>

        <aside className="admin-sidebar fixed left-0 top-0 h-full z-50 hidden lg:block">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <Shield className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">SmartMark</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setAdminView('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminView === 'dashboard' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <BarChart3 className="w-5 h-5" />
                Dashboard
              </button>
              <button
                onClick={() => setAdminView('users')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminView === 'users' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Users className="w-5 h-5" />
                Users
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{allUsers.length}</span>
              </button>
              <button
                onClick={() => setAdminView('bookmarks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${adminView === 'bookmarks' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Bookmark className="w-5 h-5" />
                All Bookmarks
                <span className="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{allBookmarks.length}</span>
              </button>
            </nav>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <img src={user?.avatar} alt="" className="w-10 h-10 rounded-full" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-600 rounded-lg">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </aside>

        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-card border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-gray-900" />
              <span className="font-bold text-gray-900">Admin</span>
            </div>
            <button onClick={logout} className="p-2 text-gray-600">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <main className="flex-grow lg:ml-[260px] p-4 lg:p-8 pt-20 lg:pt-8">
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users, bookmarks..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {adminView === 'dashboard' && adminStats && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+{adminStats.newUsersToday} today</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{adminStats.totalUsers}</p>
                  <p className="text-sm text-gray-500">Total Users</p>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Bookmark className="w-6 h-6 text-purple-600" />
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">+{adminStats.newBookmarksToday} today</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{adminStats.totalBookmarks}</p>
                  <p className="text-sm text-gray-500">Total Bookmarks</p>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{adminStats.futureBookmarks}</p>
                  <p className="text-sm text-gray-500">Scheduled</p>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{adminStats.avgBookmarksPerUser}</p>
                  <p className="text-sm text-gray-500">Avg/User</p>
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {allBookmarks.slice(0, 5).map(bm => (
                    <div key={bm.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <img src={`https://www.google.com/s2/favicons?domain=${bm.domain}&sz=32`} alt="" className="w-5 h-5" />
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{bm.title}</p>
                        <p className="text-xs text-gray-500">by {bm.userName} • {getTimeAgo(bm.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {adminView === 'users' && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-bold text-gray-900">All Users</h2>
              
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">User</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Email</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Joined</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Bookmarks</th>
                        <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img src={u.avatar} alt="" className="w-10 h-10 rounded-full" />
                              <div>
                                <p className="font-medium text-gray-900">{u.name}</p>
                                {u.isAdmin && <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Admin</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                              {u.bookmarkCount || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {!u.isAdmin && (
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {adminView === 'bookmarks' && (
            <div className="space-y-6 animate-slide-up">
              <h2 className="text-2xl font-bold text-gray-900">All Bookmarks</h2>
              
              <div className="space-y-3">
                {filteredAllBookmarks.map(bm => (
                  <div key={bm.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bm.isFuture ? 'bg-amber-100' : 'bg-gray-100'}`}>
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${bm.domain}&sz=64`}
                        alt=""
                        className="w-5 h-5"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{bm.title}</h3>
                        {bm.isFuture && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Future</span>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>by {bm.userName}</span>
                        <span>•</span>
                        <a href={bm.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 truncate max-w-xs inline-block">{bm.url}</a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{getTimeAgo(bm.createdAt)}</span>
                      <button
                        onClick={() => deleteAnyBookmark(bm.id)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // USER COMBINED DASHBOARD & BOOKMARKS
  const filteredBookmarks = getFilteredBookmarks();

  // Calculate stats
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const totalBookmarks = bookmarks.length;
  const futureBookmarks = bookmarks.filter(b => b.isFuture && new Date(b.scheduledDate) > now).length;
  const todayBookmarks = bookmarks.filter(b => {
    const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
    return date.toDateString() === today.toDateString();
  }).length;
  const thisWeekBookmarks = bookmarks.filter(b => {
    const date = new Date(b.isFuture ? b.scheduledDate : b.createdAt);
    return date >= weekStart && date <= weekEnd;
  }).length;

  return (
    <div className="min-h-screen flex flex-col relative">
      <style>{styles}</style>
      {/* Audio element for alarm */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanu87plHQUuh9Dz2YU2Bhxqv+zplkcODVGm5O+4ZSAEMYrO89GFNwYdcfDr4ZdJDQtPp+XysWUeBjiS1/LNfi0GI33R8tOENAcdcO/r4phJDQxPqOXyxWUhBjqT1/PQfS4GI3/R8tSFNwYdcfDr4plHDAtQp+TwxmUgBDeOzvPVhjYGHG3A7+SaSQ0MTKjl8sZmIAU2jc7z1YU1Bhxwv+zmm0gNC1Gn5O/EZSAFNo/M89CEMwYccPDs4ppIDQtRp+TvvWUfBTiOzvPShjUGG3Dw7OKbSA0LUqjl8b1kHwU3jM7z0oU1Bxtw8OzhmUgNC1Ko5fG+ZSAF" type="audio/wav" />
      </audio>
      
      <div className="bg-gradient"></div>
      <div className="bg-pattern"></div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-card border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center">
                <Bookmark className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">SmartMark</span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Alarm Button */}
              <button 
                onClick={() => setShowAlarmDialog(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <AlarmClock className="w-5 h-5" />
                {alarms.some(a => a.enabled) && <span className="alarm-badge"></span>}
              </button>

              {/* Sound Toggle */}
              <button 
                onClick={toggleAlarmSound}
                className={`p-2 rounded-xl transition-all ${alarmSound ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                title={alarmSound ? 'Sound On' : 'Sound Off'}
              >
                {alarmSound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              
              <button 
                onClick={() => setShowNotificationDialog(true)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <img src={user?.avatar} alt="Profile" className="w-9 h-9 rounded-full border-2 border-white shadow-sm" />
                <button onClick={logout} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl animate-slide-up">
        
        {/* COMBINED DASHBOARD & BOOKMARKS */}
        <div className="space-y-8">
          {/* Welcome & Stats Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name?.split(' ')[0]}! Here's your overview.</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Bookmark className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalBookmarks}</p>
                <p className="text-sm text-gray-500">Total Bookmarks</p>
              </div>

              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{futureBookmarks}</p>
                <p className="text-sm text-gray-500">Scheduled</p>
              </div>

              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                  <CalendarDays className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{todayBookmarks}</p>
                <p className="text-sm text-gray-500">Today</p>
              </div>

              <div className="glass-card p-6 rounded-2xl">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{thisWeekBookmarks}</p>
                <p className="text-sm text-gray-500">This Week</p>
              </div>
            </div>
          </div>

          {/* Add Bookmark & Calendar Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Bookmark */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add New Bookmark
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-grow relative">
                    <Link className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="url" 
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Paste URL here..." 
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && !addingBookmark && addBookmark()}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-grow relative">
                    <Edit3 className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="Title (optional)" 
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && !addingBookmark && addBookmark()}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input 
                      type="date" 
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                    />
                  </div>
                  <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${isFuture ? 'bg-amber-100 border border-amber-200' : 'bg-amber-50 border border-amber-200 hover:bg-amber-100'}`}>
                    <input 
                      type="checkbox" 
                      checked={isFuture}
                      onChange={(e) => setIsFuture(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                    <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Schedule for later
                    </span>
                  </label>
                  <button 
                    onClick={addBookmark}
                    disabled={addingBookmark || !urlInput.trim()}
                    className="bg-gray-900 text-white px-6 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
                  >
                    {addingBookmark ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {addingBookmark ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Widget */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-1.5 hover:bg-gray-100 rounded-lg">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
              
              <div className="calendar-grid mb-2">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="calendar-grid">{renderCalendar()}</div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Has bookmarks</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border-2 border-gray-900"></div>
                  <span>Today</span>
                </div>
              </div>

              {selectedDate && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Selected: {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <button onClick={() => { setSelectedDate(null); setCurrentFilter('all'); }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {['all', 'today', 'week', 'month', 'future'].map((filter) => (
              <button
                key={filter}
                onClick={() => { setCurrentFilter(filter); setSelectedDate(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentFilter === filter ? 'bg-gray-900 text-white' : filter === 'future' ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
              >
                {filter === 'future' && <Clock className="w-3 h-3 inline mr-1" />}
                {filter === 'all' ? 'All Bookmarks' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Bookmarks List with Edit */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              {selectedDate ? 'Bookmarks for Selected Date' : currentFilter === 'all' ? 'All Bookmarks' : `${currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1)} Bookmarks`}
              <span className="text-sm font-normal text-gray-500">({filteredBookmarks.length})</span>
            </h3>

            {filteredBookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center glass-card rounded-2xl">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No bookmarks found</h3>
                <button onClick={() => { setCurrentFilter('all'); setSelectedDate(null); }} className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookmarks.map((bm, index) => {
                  const date = new Date(bm.isFuture ? bm.scheduledDate : bm.createdAt);
                  const isFutureItem = bm.isFuture && date > new Date();
                  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });

                  // Check if this bookmark is being edited
                  const isEditing = editingBookmark && editingBookmark.id === bm.id;

                  if (isEditing) {
                    return (
                      <div key={bm.id} className="glass-card rounded-xl p-4 border-2 border-indigo-200 animate-slide-up">
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-grow relative">
                              <Link className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                              <input 
                                type="url" 
                                value={editUrl}
                                onChange={(e) => setEditUrl(e.target.value)}
                                placeholder="URL" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-grow relative">
                              <Edit3 className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
                              <input 
                                type="text" 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Title" 
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                              <input 
                                type="date" 
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                              />
                            </div>
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${editIsFuture ? 'bg-amber-100 border border-amber-200' : 'bg-amber-50 border border-amber-200'}`}>
                              <input 
                                type="checkbox" 
                                checked={editIsFuture}
                                onChange={(e) => setEditIsFuture(e.target.checked)}
                                className="w-4 h-4 text-amber-600 rounded"
                              />
                              <span className="text-xs font-medium text-amber-700">Schedule</span>
                            </label>
                            <div className="flex gap-2 sm:ml-auto">
                              <button 
                                onClick={saveEditBookmark}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all"
                              >
                                <Save className="w-4 h-4" /> Save
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-gray-300 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={bm.id} className="glass-card bookmark-item rounded-xl p-4 flex items-center gap-4 group animate-slide-up" style={{animationDelay: `${index*50}ms`}}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFutureItem ? 'bg-amber-100' : 'bg-gray-100'}`}>
                        <img src={`https://www.google.com/s2/favicons?domain=${bm.domain}&sz=64`} alt="" className="w-5 h-5" onError={(e) => e.target.style.display='none'} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 truncate">{bm.title}</h3>
                          {isFutureItem && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Future</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <a href={bm.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 truncate">{bm.url}</a>
                          <span>•</span>
                          <span className={isFutureItem ? 'text-amber-600 font-medium' : ''}>
                            {isFutureItem ? <Clock className="w-3 h-3 inline mr-1" /> : <Calendar className="w-3 h-3 inline mr-1" />}
                            {dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a href={bm.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button onClick={() => startEditBookmark(bm)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteBookmark(bm.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Toast */}
      <div className={`fixed bottom-6 right-6 transform transition-all duration-300 z-50 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
        <div className={`glass-card px-5 py-3 rounded-xl shadow-xl border-l-4 flex items-center gap-3 min-w-[300px] ${toast.type === 'error' ? 'border-red-500' : 'border-gray-900'}`}>
          {toast.type === 'error' ? <AlertCircle className="text-red-500 w-5 h-5" /> : <CheckCircle className="text-gray-900 w-5 h-5" />}
          <span className="text-sm font-medium text-gray-900">{toast.message}</span>
        </div>
      </div>

      {/* Alarm Dialog */}
      <div className={`dialog-overlay ${showAlarmDialog ? 'active' : ''}`} onClick={() => setShowAlarmDialog(false)}></div>
      <div className={`dialog-box ${showAlarmDialog ? 'active' : ''}`}>
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl max-w-md">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <AlarmClock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Alarms</h3>
                <p className="text-xs text-gray-500">{alarms.filter(a => a.enabled).length} active alarms</p>
              </div>
            </div>
            <button onClick={() => setShowAlarmDialog(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Add New Alarm */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-900">Set New Alarm</h4>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={newAlarmTime}
                  onChange={(e) => setNewAlarmTime(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                />
              </div>
              <input 
                type="text" 
                value={newAlarmMessage}
                onChange={(e) => setNewAlarmMessage(e.target.value)}
                placeholder="Alarm message (optional)"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
              />
              <button 
                onClick={addAlarm}
                disabled={!newAlarmTime}
                className="w-full bg-amber-500 text-white py-2 rounded-lg font-medium text-sm hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4 inline mr-1" /> Add Alarm
              </button>
            </div>

            {/* Alarm List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {alarms.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">No alarms set</p>
              ) : (
                alarms.map(alarm => (
                  <div key={alarm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleAlarm(alarm.id)}
                        className={`w-10 h-6 rounded-full transition-all ${alarm.enabled ? 'bg-amber-500' : 'bg-gray-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-all ${alarm.enabled ? 'translate-x-5' : 'translate-x-1'}`}></div>
                      </button>
                      <div>
                        <p className="font-medium text-gray-900">{alarm.time}</p>
                        <p className="text-xs text-gray-500">{alarm.message || 'Alarm'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteAlarm(alarm.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Dialog */}
      <div className={`dialog-overlay ${showNotificationDialog ? 'active' : ''}`} onClick={() => setShowNotificationDialog(false)}></div>
      <div className={`dialog-box ${showNotificationDialog ? 'active' : ''}`}>
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount > 0 ? `${unreadCount} unread` : 'No new notifications'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllNotificationsRead} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowNotificationDialog(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="w-6 h-6 text-gray-400 mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!n.read ? 'bg-indigo-50/30' : ''}`} onClick={() => markNotificationRead(n.id)}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${n.color === 'blue' ? 'bg-blue-100 text-blue-600' : n.color === 'amber' ? 'bg-amber-100 text-amber-600' : n.color === 'green' ? 'bg-green-100 text-green-600' : n.color === 'red' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                    {n.icon === 'smartphone' ? <Smartphone className="w-4 h-4" /> : n.icon === 'clock' ? <Clock className="w-4 h-4" /> : n.icon === 'users' ? <Users className="w-4 h-4" /> : n.icon === 'alarm-clock' ? <AlarmClock className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="font-medium text-gray-900 text-sm">{n.title}</h4>
                      <span className="text-xs text-gray-400">{getTimeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{n.message}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;