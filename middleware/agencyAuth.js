const jwt = require('jsonwebtoken');
const PermissionsModule = require('../security/permissions');

const agencyAuth = (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authentication token provided' });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        const requiredPermission = req.body?.permission || req.query?.permission;
        if (requiredPermission && !PermissionsModule.hasPermission(decoded.role, requiredPermission)) {
            return res.status(403).json({ error: 'You do not have permission for this action' });
        }
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = agencyAuth;