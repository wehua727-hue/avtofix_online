import User from '../models/User.js';

// Simple auth middleware that checks for userId in request body/query
// In a production app, you'd use JWT tokens or sessions
const auth = async (req, res, next) => {
  try {
    // Get userId from headers, body, or query
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Autentifikatsiya talab qilinadi' });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
    }

    // Attach user info to request
    req.user = {
      id: user._id.toString(),
      role: user.role || 'user',
      name: user.name,
      phone: user.phone,
      isOwner: user.role === 'owner',
      isAdmin: user.role === 'admin' || user.role === 'owner' || user.role === 'xodim',
      isManager: user.role === 'manager',
      isHelper: user.role === 'helper',
      managerOfShop: user.managerOfShop ? user.managerOfShop.toString() : null,
      helperPermissions: user.helperPermissions || { products: false, orders: false, helpers: false },
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Autentifikatsiya xatosi' });
  }
};

// Middleware to check if user is owner
export const requireOwner = async (req, res, next) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Owner huquqi kerak' });
  }
  next();
};

// Middleware to check if user is admin, owner, or xodim
export const requireAdmin = async (req, res, next) => {
  if (!req.user || !['admin', 'owner', 'xodim'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin huquqi kerak' });
  }
  next();
};

// Manager only (not owner)
export const requireManager = async (req, res, next) => {
  if (!req.user || req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Menedjer huquqi kerak' });
  }
  next();
};

// Manager or Owner
export const requireManagerOrOwner = async (req, res, next) => {
  if (!req.user || !['manager', 'owner'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Menedjer yoki Owner huquqi kerak' });
  }
  next();
};

// Helper must have given permission key
export const requireHelperWithPermissions = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user || req.user.role !== 'helper') {
      return res.status(403).json({ message: 'Yordamchi huquqi kerak' });
    }
    if (!req.user.helperPermissions || req.user.helperPermissions[permissionKey] !== true) {
      return res.status(403).json({ message: 'Bu bo\'limga ruxsat yo\'q' });
    }
    next();
  };
};

// JWT token authentication for comments
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Token topilmadi' });
    }

    // Simple token validation - in production use JWT
    // For now, we'll use userId from token as simple auth
    const userId = token; // Simplified - should decode JWT
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });
    }

    req.user = {
      userId: user._id.toString(),
      name: user.name,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Token authentication error:', error);
    return res.status(403).json({ message: 'Token noto\'g\'ri' });
  }
};

export default auth;
