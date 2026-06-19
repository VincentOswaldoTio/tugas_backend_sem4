import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

/**
 * Authentication middleware - verifies JWT token from Authorization header
 * Attaches decoded payload to req.user on success
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau telah berakhir, silakan login kembali'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username, isAdmin }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau telah berakhir, silakan login kembali'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid atau telah berakhir, silakan login kembali'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token tidak valid atau telah berakhir, silakan login kembali'
    });
  }
};

/**
 * Authorization middleware - ensures user can only access their own data
 * Allows access if req.user.userId matches route param :userId or req.body.userId
 * Also allows if user is admin (req.user.isAdmin === true)
 */
export const ensureSelf = (req, res, next) => {
  const userIdFromParams = req.params.userId;
  const userIdFromBody = req.body?.userId;
  const tokenUserId = req.user?.userId;
  const isAdmin = req.user?.isAdmin === true;

  // Check if user is accessing their own data or is admin
  const targetUserId = userIdFromParams || userIdFromBody;

  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      message: 'User ID diperlukan'
    });
  }

  if (tokenUserId === targetUserId || isAdmin) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki izin untuk mengakses data ini'
    });
  }
};

/**
 * Admin authorization middleware - requires admin role
 * Must be used after authenticate middleware
 */
export const authorizeAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki izin untuk mengakses data ini'
    });
  }
  next();
};

/**
 * Generate JWT token for user
 */
export const generateToken = (user) => {
  const payload = {
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin === true
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

/**
 * Verify token and return decoded payload (for use in services if needed)
 */
export const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};