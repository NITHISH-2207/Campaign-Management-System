const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'Access denied. No token provided.' 
            });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Access denied. Invalid token format.' 
            });
        }
        
        const decoded = jwt.verify(token, config.jwtSecret);
        
        // Optionally, verify user still exists
        const user = await User.findById(decoded.id).select('_id role');
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        req.user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token has expired. Please login again.' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token' 
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Token verification failed' 
        });
    }
};

module.exports = authMiddleware;
