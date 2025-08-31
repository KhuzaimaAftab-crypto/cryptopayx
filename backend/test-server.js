/**
 * CryptoPayX Simple Test Server
 * Developed by Khuzaima Aftab (@KhuzaimaAftab-crypto)
 * 
 * This is a minimal test server to verify the setup works
 */

// Simple HTTP server without external dependencies
const http = require('http');
const url = require('url');
const path = require('path');

const PORT = process.env.PORT || 5000;

// Simple in-memory user storage for testing
let users = [
  {
    id: 1,
    email: 'khuzaima@cryptopayx.com',
    firstName: 'Khuzaima',
    lastName: 'Aftab',
    walletAddress: '0x742d35Cc6634C0532925a3b8D78C3A9c2a7e3d5A',
    isVerified: true,
    createdAt: new Date().toISOString()
  }
];

// Simple authentication responses
const authResponses = {
  login: {
    success: true,
    message: 'Login successful',
    data: {
      token: 'jwt_token_placeholder_khuzaima_aftab',
      user: users[0]
    }
  },
  register: {
    success: true,
    message: 'User registered successfully',
    data: {
      token: 'jwt_token_placeholder_khuzaima_aftab',
      user: users[0]
    }
  }
};

// Simple request handler
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      message: 'CryptoPayX Backend is running!',
      developer: 'Khuzaima Aftab (@KhuzaimaAftab-crypto)',
      version: '1.0.0'
    }));
    return;
  }

  // Authentication endpoints
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('🔐 Login attempt:', data.email);
        
        // Simple validation
        if (data.email && data.password) {
          res.writeHead(200);
          res.end(JSON.stringify(authResponses.login));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            message: 'Email and password are required'
          }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid JSON data'
        }));
      }
    });
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('📝 Registration attempt:', data.email);
        
        // Simple validation
        if (data.email && data.password && data.firstName && data.lastName && data.walletAddress) {
          // Create new user
          const newUser = {
            id: users.length + 1,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            walletAddress: data.walletAddress,
            isVerified: false,
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          
          const response = {
            ...authResponses.register,
            data: {
              ...authResponses.register.data,
              user: newUser
            }
          };
          
          res.writeHead(201);
          res.end(JSON.stringify(response));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({
            success: false,
            message: 'All fields are required: email, password, firstName, lastName, walletAddress'
          }));
        }
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({
          success: false,
          message: 'Invalid JSON data'
        }));
      }
    });
    return;
  }

  // Users list endpoint
  if (pathname === '/api/users' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: { users }
    }));
    return;
  }

  // 404 handler
  res.writeHead(404);
  res.end(JSON.stringify({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: [
      'GET /health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/users'
    ]
  }));
});

server.listen(PORT, () => {
  console.log('🚀 CryptoPayX Backend Test Server Started!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`👨‍💻 Developed by Khuzaima Aftab (@KhuzaimaAftab-crypto)`);
  console.log(`🔗 GitHub: https://github.com/KhuzaimaAftab-crypto/cryptopayx`);
  console.log('');
  console.log('Available Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  GET  http://localhost:${PORT}/api/users`);
  console.log('');
  console.log('🔥 Ready to accept requests!');
});

module.exports = server;