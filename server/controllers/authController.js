import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// Generate JWT token
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  console.log('Generating token with secret:', secret ? 'EXISTS' : 'MISSING');
  return jwt.sign({ id: userId }, secret, {
    expiresIn: '7d'
  });
};

// Register new user
export const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user (password will be hashed by the pre-save hook)
    const user = new User({ fullName, email, password });
    await user.save();
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { 
        id: user._id, 
        fullName: user.fullName, 
        email: user.email 
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    console.log('User found, checking password...');
    
    // Check password using bcrypt comparison
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user._id);
    console.log('Token generated:', token ? 'YES' : 'NO');
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    
    const response = { 
      message: 'Login successful',
      token,
      user: { 
        id: user._id, 
        fullName: user.fullName, 
        email: user.email 
      }
    };
    
    console.log('Sending response:', JSON.stringify(response, null, 2));
    
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
