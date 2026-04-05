const validator = require('validator');
const ValidationModule = {
    validateEmail: (email) => {
        if (!email || typeof email !== 'string') return false;
        return validator.isEmail(email);
    },
    validatePassword: (password) => {
        if (!password || password.length < 8) return false;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    },
    validatePhoneNumber: (phone) => {
        if (!phone || typeof phone !== 'string') return false;
        return validator.isMobilePhone(phone, 'en-US', { strictMode: false });
    },
    validateFileUpload: (file, allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'], maxSize = 10 * 1024 * 1024) => {
        if (!file) return { valid: false, error: 'No file provided' };
        if (!allowedMimes.includes(file.mimetype)) {
            return { valid: false, error: 'File type not allowed' };
        }
        if (file.size > maxSize) {
            return { valid: false, error: 'File size too large' };
        }
        return { valid: true };
    }
};
module.exports = ValidationModule;