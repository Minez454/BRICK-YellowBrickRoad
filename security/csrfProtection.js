const csrf = require('csurf');

// This sets up the "Secret Handshake" using Cookies
const csrfProtection = csrf({ cookie: true });

module.exports = csrfProtection;
