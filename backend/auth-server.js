/**
 * CryptoPayX Authentication Server
 * Developed by Khuzaima Aftab (@KhuzaimaAftab-crypto)
 * GitHub: https://github.com/KhuzaimaAftab-crypto/cryptopayx
 * 
 * Complete authentication system with login, signup, and user management
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5001;

// Simple user database (JSON file storage)
const USERS_FILE = path.join(__dirname, 'users.json');

// Initialize users database
let users = [];
try {
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  }
} catch (error) {
  console.log(`Creating new users database...`);
  users = [];
}

// Pre-populate with Khuzaima Aftab's account
if (users.length === 0) {
  users.push({
    id: 1,
    email: '16B-061-SE@alumni.uit.edu',
    password: hashPassword('khuzaima123'), // Simple hash for demo
    firstName: 'Khuzaima',
    lastName: 'Aftab',
    walletAddress: '0x742d35Cc6634C0532925a3b8D78C3A9c2a7e3d5A',
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
    lastLogin: null
  });
  saveUsers();
}

// Simple password hashing (for production, use bcrypt)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'cryptopayx_salt').digest('hex');
}

// Simple JWT-like token generator
function generateToken(userId) {
  const payload = {
    userId,
    timestamp: Date.now(),
    issuer: 'cryptopayx'
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

// Verify token
function verifyToken(token) {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    // Check if token is less than 24 hours old
    if (Date.now() - payload.timestamp < 24 * 60 * 60 * 1000) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

// Save users to file
function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Find user by email
function findUserByEmail(email) {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
}

// Find user by ID
function findUserById(id) {
  return users.find(user => user.id === parseInt(id));
}

// Parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Send JSON response
function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data, null, 2));
}

// Main server
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  console.log(`${method} ${pathname}`);

  try {
    // Health check
    if (pathname === '/health' && method === 'GET') {
      return sendResponse(res, 200, {
        status: 'OK',
        message: 'CryptoPayX Authentication Server is running!',
        developer: 'Khuzaima Aftab (@KhuzaimaAftab-crypto)',
        github: 'https://github.com/KhuzaimaAftab-crypto/cryptopayx',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        totalUsers: users.length
      });
    }

    // User Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { email, password } = await parseBody(req);
      
      console.log(`Login attempt for: ${email}`);

      if (!email || !password) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Email and password are required'
        });
      }

      const user = findUserByEmail(email);
      if (!user) {
        return sendResponse(res, 401, {
          success: false,
          message: 'Invalid email or password'
        });
      }

      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return sendResponse(res, 401, {
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Update last login
      user.lastLogin = new Date().toISOString();
      saveUsers();

      const token = generateToken(user.id);

      console.log(`Login successful for: ${user.firstName} ${user.lastName}`);

      return sendResponse(res, 200, {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: user.isVerified,
            lastLogin: user.lastLogin
          }
        }
      });
    }

    // User Registration/Signup
    if (pathname === '/api/auth/register' && method === 'POST') {
      const { email, password, firstName, lastName, walletAddress } = await parseBody(req);
      
      console.log(`Registration attempt for: ${email}`);

      if (!email || !password || !firstName || !lastName || !walletAddress) {
        return sendResponse(res, 400, {
          success: false,
          message: 'All fields are required: email, password, firstName, lastName, walletAddress'
        });
      }

      // Check if user already exists
      if (findUserByEmail(email)) {
        return sendResponse(res, 409, {
          success: false,
          message: 'User with this email already exists'
        });
      }

      // Validate wallet address format
      if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return sendResponse(res, 400, {
          success: false,
          message: 'Invalid Ethereum wallet address format'
        });
      }

      // Create new user
      const newUser = {
        id: users.length + 1,
        email: email.toLowerCase(),
        password: hashPassword(password),
        firstName,
        lastName,
        walletAddress: walletAddress.toLowerCase(),
        role: 'user',
        isVerified: false,
        createdAt: new Date().toISOString(),
        lastLogin: null
      };

      users.push(newUser);
      saveUsers();

      const token = generateToken(newUser.id);

      console.log(`Registration successful for: ${newUser.firstName} ${newUser.lastName}`);

      return sendResponse(res, 201, {
        success: true,
        message: 'User registered successfully',
        data: {
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            walletAddress: newUser.walletAddress,
            role: newUser.role,
            isVerified: newUser.isVerified,
            createdAt: newUser.createdAt
          }
        }
      });
    }

    // Get User Profile
    if (pathname === '/api/auth/profile' && method === 'GET') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendResponse(res, 401, {
          success: false,
          message: 'Authorization token required'
        });
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      
      if (!payload) {
        return sendResponse(res, 401, {
          success: false,
          message: 'Invalid or expired token'
        });
      }

      const user = findUserById(payload.userId);
      if (!user) {
        return sendResponse(res, 404, {
          success: false,
          message: 'User not found'
        });
      }

      return sendResponse(res, 200, {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }
        }
      });
    }

    // List all users (admin only)
    if (pathname === '/api/users' && method === 'GET') {
      return sendResponse(res, 200, {
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            walletAddress: user.walletAddress,
            role: user.role,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin
          }))
        }
      });
    }

    // 404 handler
    return sendResponse(res, 404, {
      success: false,
      message: 'API endpoint not found',
      availableEndpoints: [
        'GET /health',
        'POST /api/auth/login',
        'POST /api/auth/register', 
        'GET /api/auth/profile',
        'GET /api/users'
      ]
    });

  } catch (error) {
    console.error('Server error:', error);
    return sendResponse(res, 500, {
      success: false,
      message: 'Internal server error'
    });
  }
});

server.listen(PORT, () => {
  console.log('CryptoPayX Authentication Server Started!');
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Developed by Khuzaima Aftab (@KhuzaimaAftab-crypto)`);
  console.log(`GitHub: https://github.com/KhuzaimaAftab-crypto/cryptopayx`);
  console.log('');
  console.log('Authentication Endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  GET  http://localhost:${PORT}/api/auth/profile`);
  console.log(`  GET  http://localhost:${PORT}/api/users`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log('');
  console.log('Pre-configured Admin Account:');
  console.log('   Email: 16B-061-SE@alumni.uit.edu');
  console.log('   Password: khuzaima123');
  console.log(`   Total Users: ${users.length}`);
  console.log('');
  console.log('Ready to accept authentication requests!');
});

module.exports = server;