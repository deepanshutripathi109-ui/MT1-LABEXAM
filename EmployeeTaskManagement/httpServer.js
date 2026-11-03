
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Read tasks from JSON file
function readTasks() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            fs.writeFileSync(DATA_FILE, '[]');
        }

        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (error) {
        console.error('Could not read tasks:', error.message);
        throw error;
    }
}

// Write tasks to JSON file
function writeTasks(tasks) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(tasks, null, 2)
    );
}

// Send JSON response
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8'
    });

    res.end(JSON.stringify(data));
}

// Read JSON request body
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error('Invalid JSON body'));
            }
        });

        req.on('error', reject);
    });
}

// Serve index.html using FS module
function serveIndex(res) {
    fs.readFile(
        path.join(PUBLIC_DIR, 'index.html'),
        'utf8',
        (err, html) => {
            if (err) {
                console.error('File error:', err.message);

                res.writeHead(500, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });

                return res.end('Unable to load index.html');
            }

            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            res.end(html);
        }
    );
}

// Create native HTTP server
const server = http.createServer(async (req, res) => {

    const url = new URL(req.url, 'http://localhost:3000');
    const pathname = url.pathname;

    console.log(`${req.method} ${pathname}`);

    // GET / - Welcome message in HTML
    if (req.method === 'GET' && pathname === '/') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        return res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Employee Task Management</title>
            </head>
            <body>
                <h1>Welcome to Employee Task Management</h1>
                <p>Manage employee tasks easily.</p>
            </body>
            </html>
        `);
    }

    // GET /about - Application information
    if (req.method === 'GET' && pathname === '/about') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        return res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>About</title>
            </head>
            <body>
                <h1>About Employee Task Management</h1>
                <p>This application helps manage employee tasks.</p>
                <p>It is developed using Node.js HTTP and FS modules.</p>
            </body>
            </html>
        `);
    }

    // GET /home - Serve HTML file using FS module
    if (req.method === 'GET' && pathname === '/home') {
        return serveIndex(res);
    }

    // GET /tasks - Retrieve all employee tasks
    if (req.method === 'GET' && pathname === '/tasks') {
        try {
            const tasks = readTasks();
            return sendJson(res, 200, tasks);
        } catch (error) {
            return sendJson(res, 500, {
                error: 'Could not retrieve tasks'
            });
        }
    }

    // POST /add-task - Add a new employee task
    if (req.method === 'POST' && pathname === '/add-task') {
        try {
            const body = await readBody(req);

            // Validate required fields
            if (
                body.id === undefined ||
                body.id === null ||
                String(body.id).trim() === '' ||
                typeof body.taskName !== 'string' ||
                !body.taskName.trim() ||
                typeof body.assignedTo !== 'string' ||
                !body.assignedTo.trim() ||
                typeof body.status !== 'string' ||
                !body.status.trim()
            ) {
                return sendJson(res, 400, {
                    error: 'Required fields: id, taskName, assignedTo, status'
                });
            }

            const tasks = readTasks();

            // Check duplicate ID
            const exists = tasks.some(
                task => String(task.id) === String(body.id)
            );

            if (exists) {
                return sendJson(res, 409, {
                    error: 'Task ID already exists'
                });
            }

            const newTask = {
                id: body.id,
                taskName: body.taskName.trim(),
                assignedTo: body.assignedTo.trim(),
                status: body.status.trim()
            };

            tasks.push(newTask);
            writeTasks(tasks);

            return sendJson(res, 201, {
                message: 'Task added successfully',
                task: newTask
            });

        } catch (error) {
            if (error.message === 'Invalid JSON body') {
                return sendJson(res, 400, {
                    error: 'Invalid JSON body'
                });
            }

            console.error(error.message);

            return sendJson(res, 500, {
                error: 'Could not add task'
            });
        }
    }

    // Handle invalid routes
    res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8'
    });

    res.end('404 - Page not found');
});

// Start server
server.listen(PORT, () => {
    console.log(`Native HTTP server running at http://localhost:${PORT}`);
});
