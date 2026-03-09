import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    console.log('Auth middleware - Authorization header:', authHeader ? 'EXISTS' : 'MISSING');
    
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }
    
    console.log('Auth middleware - Token preview:', token.substring(0, 20) + '...');
    
    // Verify token
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    console.log('Auth middleware - Using secret:', secret ? 'EXISTS' : 'MISSING');
    
    const decoded = jwt.verify(token, secret);
    console.log('Auth middleware - Token decoded, user ID:', decoded.id);
    
    // Find user
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('Auth middleware - User not found for ID:', decoded.id);
      return res.status(401).json({ message: 'User not found' });
    }
    
    console.log('Auth middleware - User authenticated:', user.email);
    
    // Attach user to request
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth middleware - Error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
