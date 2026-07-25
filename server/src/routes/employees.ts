import { Router, Request, Response } from 'express';
import db from '../models/database';

const router = Router();

// GET /api/employees - list all active employees
router.get('/', (_req: Request, res: Response) => {
  try {
    const employees = db.prepare('SELECT id, code, name FROM employees WHERE active = 1 ORDER BY name').all();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving employees' });
  }
});

// POST /api/employees/login - validate employee code
router.post('/login', (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code: string };
    if (!code) {
      res.status(400).json({ error: 'Employee code is required' });
      return;
    }
    const employee = db.prepare('SELECT id, code, name FROM employees WHERE code = ? AND active = 1').get(code.trim().toUpperCase());
    if (!employee) {
      res.status(401).json({ error: 'Employee not found' });
      return;
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Login error' });
  }
});

// POST /api/employees - create employee (admin)
router.post('/', (req: Request, res: Response) => {
  try {
    const { code, name } = req.body as { code: string; name: string };
    if (!code || !name) {
      res.status(400).json({ error: 'Code and name are required' });
      return;
    }
    const stmt = db.prepare('INSERT INTO employees (code, name) VALUES (?, ?)');
    const result = stmt.run(code.trim().toUpperCase(), name.trim());
    res.status(201).json({ id: result.lastInsertRowid, code, name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Employee code already exists' });
    } else {
      res.status(500).json({ error: 'Error creating employee' });
    }
  }
});

export default router;
