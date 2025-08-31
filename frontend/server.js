const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`📡 ${req.method} ${req.url}`);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = req.url === '/' ? '/auth.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const extname = path.extname(filePath);
  let contentType = 'text/html';

  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>File not found: ${req.url}</h1>
            <p>Available files:</p>
            <ul>
              <li><a href="/auth.html">Authentication Page</a></li>
            </ul>
          </body>
        </html>
      `);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('🚀 CryptoPayX Frontend Server Started!');
  console.log(`📱 Frontend running on http://localhost:${PORT}`);
  console.log(`🔗 Open: http://localhost:${PORT}/auth.html`);
  console.log(`👨‍💻 Developed by KhuzaimaAftab-crypto`);
  console.log('');
  console.log('🔥 Ready to serve authentication frontend!');
});

module.exports = server;