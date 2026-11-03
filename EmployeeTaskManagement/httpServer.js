// Native Node.js HTTP server demonstrating routing, HTTP methods and FS module.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

function readTasks() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Could not read tasks:', error.message);
    return [];
  }
}
function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}
function serveIndex(res) {
  // FS module serves the static HTML file.
  fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8', (err, html) => {
    if (err) return sendJson(res, 500, { error: 'Unable to load index.html' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  console.log(`${req.method} ${pathname}`);

  if (req.method === 'GET' && pathname === '/') return serveIndex(res);

  // GET: list all tasks.
  if (req.method === 'GET' && pathname === '/api/tasks') {
    return sendJson(res, 200, readTasks());
  }

  // POST: create a task.
  if (req.method === 'POST' && pathname === '/api/tasks') {
    try {
      const body = await readBody(req);
      if (!body.title || !body.employee) return sendJson(res, 400, { error: 'title and employee are required' });
      const tasks = readTasks();
      const task = { id: Date.now().toString(), title: body.title, employee: body.employee,
        status: body.status || 'Pending', dueDate: body.dueDate || '' };
      tasks.push(task); writeTasks(tasks);
      return sendJson(res, 201, task);
    } catch (err) { return sendJson(res, 400, { error: err.message }); }
  }

  // PATCH: update task status/details.
  const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (match && req.method === 'PATCH') {
    try {
      const body = await readBody(req);
      const tasks = readTasks();
      const task = tasks.find(t => t.id === match[1]);
      if (!task) return sendJson(res, 404, { error: 'Task not found' });
      Object.assign(task, body); writeTasks(tasks);
      return sendJson(res, 200, task);
    } catch (err) { return sendJson(res, 400, { error: err.message }); }
  }

  // DELETE: remove a task.
  if (match && req.method === 'DELETE') {
    const tasks = readTasks();
    const remaining = tasks.filter(t => t.id !== match[1]);
    if (remaining.length === tasks.length) return sendJson(res, 404, { error: 'Task not found' });
    writeTasks(remaining);
    return sendJson(res, 200, { message: 'Task deleted' });
  }

  // Unknown paths and unsupported methods.
  if (pathname.startsWith('/api/')) return sendJson(res, 405, { error: 'Route or method not supported' });
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 - Page not found');
});
server.listen(PORT, () => console.log(`Native HTTP server running: http://localhost:${PORT}`));
