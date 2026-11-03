// Express.js REST API implementation. Uses FS for persistent JSON task storage.
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readTasks() {
  try {
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error(error);
    return [];
  }
}
function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// GET /api/tasks - Read all tasks
app.get('/api/tasks', (req, res) => res.json(readTasks()));

// GET /api/tasks/:id - Read one task
app.get('/api/tasks/:id', (req, res) => {
  const task = readTasks().find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/tasks - Create a task
app.post('/api/tasks', (req, res) => {
  const { title, employee, status = 'Pending', dueDate = '' } = req.body;
  if (!title || !employee) return res.status(400).json({ error: 'title and employee are required' });
  const tasks = readTasks();
  const task = { id: Date.now().toString(), title, employee, status, dueDate };
  tasks.push(task); writeTasks(tasks);
  res.status(201).json(task);
});

// PUT /api/tasks/:id - Replace editable task fields
app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const index = tasks.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  const { title, employee, status, dueDate } = req.body;
  if (!title || !employee) return res.status(400).json({ error: 'title and employee are required' });
  tasks[index] = { id: tasks[index].id, title, employee, status: status || 'Pending', dueDate: dueDate || '' };
  writeTasks(tasks); res.json(tasks[index]);
});

// PATCH /api/tasks/:id - Partially update a task
app.patch('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  Object.assign(task, req.body); writeTasks(tasks); res.json(task);
});

// DELETE /api/tasks/:id - Delete a task
app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const remaining = tasks.filter(t => t.id !== req.params.id);
  if (remaining.length === tasks.length) return res.status(404).json({ error: 'Task not found' });
  writeTasks(remaining); res.json({ message: 'Task deleted' });
});

// JSON parse errors and unknown routes
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) return res.status(400).json({ error: 'Invalid JSON body' });
  next(err);
});
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => console.log(`Express app running: http://localhost:${PORT}`));
