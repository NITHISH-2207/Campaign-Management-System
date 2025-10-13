const validateRegistration = (req, res, next) => {
    const { name, email, password, role } = req.body;
    const errors = [];
    
    // Name validation
    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters long');
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        errors.push('Please provide a valid email address');
    }
    
    // Password validation
    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    // Password strength validation
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (password && !passwordRegex.test(password)) {
        errors.push('Password must contain at least one number and one special character');
    }
    
    // Role validation
    const validRoles = ['participant', 'campaign_manager', 'admin'];
    if (role && !validRoles.includes(role)) {
        errors.push('Invalid role selected');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            message: errors.join('. ') 
        });
    }
    
    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];
    
    if (!email || !email.trim()) {
        errors.push('Email is required');
    }
    
    if (!password || !password.trim()) {
        errors.push('Password is required');
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            message: errors.join('. ') 
        });
    }
    
    next();
};

module.exports = {
    validateRegistration,
    validateLogin
};
