# Implementation Guide for Security Module

This guide explains how to use the security features for your YellowBrickRoad app.

## Quick Setup
1. Install validator: npm install validator
2. Add to .env: ENCRYPTION_KEY=your-256-bit-encryption-key
3. Import security modules in your routes

## Using the Security Module

### 1. Validate User Input
Use validation in your routes to ensure emails, passwords, and phone numbers are valid.

### 2. Encrypt Sensitive Data
Use encryption to protect social security numbers, medical records, and other personal info.

### 3. Track Access
Log who accesses client information and when.

### 4. Control Permissions
Set role permissions so caseworkers only see their assigned clients.

### 5. Block Bad Actors
Lock accounts after 5 failed login attempts.

## In Your Routes
Example:
```javascript
const ValidationModule = require('../security/validation');
if (!ValidationModule.validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email' });
}

const EncryptionModule = require('../security/encryption');
const encrypted = EncryptionModule.encrypt({ ssn: clientSSN });
```

## For Agency Staff
Use agency auth middleware to protect agency portal routes so only authorized staff can access.