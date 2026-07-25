import { Router, Request, Response } from 'express';
import db from '../models/database';

const router = Router();

// GET /api/sessions - list sessions (optionally filter by employee)
router.get('/', (req: Request, res: Response) => {
  try {
    const { employee_id, status } = req.query as { employee_id?: string; status?: string };
    // Validate employee_id is a safe integer before using in query
    const employeeIdNum = employee_id ? parseInt(employee_id, 10) : undefined;
    if (employee_id && (isNaN(employeeIdNum!) || employeeIdNum! <= 0)) {
      res.status(400).json({ error: 'Invalid employee_id' });
      return;
    }
    // Validate status is one of the allowed values
    const allowedStatuses = ['open', 'closed'];
    if (status && !allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status filter' });
      return;
    }
    let query = `
      SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
             cs.location, cs.status, cs.started_at, cs.ended_at, cs.notes,
             COUNT(ci.id) AS item_count
      FROM count_sessions cs
      JOIN employees e ON cs.employee_id = e.id
      LEFT JOIN count_items ci ON ci.session_id = cs.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    if (employeeIdNum) {
      query += ' AND cs.employee_id = ?';
      params.push(employeeIdNum);
    }
    if (status) {
      query += ' AND cs.status = ?';
      params.push(status);
    }
    query += ' GROUP BY cs.id ORDER BY cs.started_at DESC LIMIT 100';
    const sessions = db.prepare(query).all(...params);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving sessions' });
  }
});

// GET /api/sessions/:id - get session detail with items
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const session = db.prepare(`
      SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
             cs.location, cs.status, cs.started_at, cs.ended_at, cs.notes
      FROM count_sessions cs
      JOIN employees e ON cs.employee_id = e.id
      WHERE cs.id = ?
    `).get(Number(id));
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const items = db.prepare(`
      SELECT id, product_code, product_name, quantity, unit, input_method, created_at
      FROM count_items
      WHERE session_id = ?
      ORDER BY created_at DESC
    `).all(Number(id));
    res.json({ ...session as object, items });
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving session' });
  }
});

// POST /api/sessions - create a new counting session
router.post('/', (req: Request, res: Response) => {
  try {
    const { employee_id, location, notes } = req.body as {
      employee_id: number; location?: string; notes?: string;
    };
    if (!employee_id) {
      res.status(400).json({ error: 'employee_id is required' });
      return;
    }
    const employee = db.prepare('SELECT id FROM employees WHERE id = ? AND active = 1').get(employee_id);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    const stmt = db.prepare(
      'INSERT INTO count_sessions (employee_id, location, notes) VALUES (?, ?, ?)'
    );
    const result = stmt.run(employee_id, location || 'COCINA', notes || null);
    res.status(201).json({ id: result.lastInsertRowid, employee_id, location: location || 'COCINA', status: 'open' });
  } catch (err) {
    res.status(500).json({ error: 'Error creating session' });
  }
});

// PUT /api/sessions/:id/close - close a session
router.put('/:id/close', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    const session = db.prepare('SELECT id FROM count_sessions WHERE id = ?').get(Number(id));
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    db.prepare(
      "UPDATE count_sessions SET status = 'closed', ended_at = datetime('now'), notes = COALESCE(?, notes) WHERE id = ?"
    ).run(notes || null, Number(id));
    res.json({ message: 'Session closed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error closing session' });
  }
});

// POST /api/sessions/:id/items - add item to session
router.post('/:id/items', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { product_code, quantity, input_method } = req.body as {
      product_code: string; quantity?: number; input_method?: string;
    };
    if (!product_code) {
      res.status(400).json({ error: 'product_code is required' });
      return;
    }
    const session = db.prepare("SELECT id, status FROM count_sessions WHERE id = ?").get(Number(id));
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if ((session as { status: string }).status === 'closed') {
      res.status(400).json({ error: 'Cannot add items to a closed session' });
      return;
    }
    // Look up product info
    const product = db.prepare('SELECT name, unit FROM products WHERE UPPER(code) = ?').get(product_code.toUpperCase()) as { name: string; unit: string } | undefined;
    const stmt = db.prepare(
      'INSERT INTO count_items (session_id, product_code, product_name, quantity, unit, input_method) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      Number(id),
      product_code.trim().toUpperCase(),
      product ? product.name : null,
      quantity ?? 1,
      product ? product.unit : null,
      input_method || 'manual'
    );
    res.status(201).json({
      id: result.lastInsertRowid,
      session_id: Number(id),
      product_code: product_code.toUpperCase(),
      product_name: product ? product.name : null,
      quantity: quantity ?? 1,
      unit: product ? product.unit : null,
      input_method: input_method || 'manual'
    });
  } catch (err) {
    res.status(500).json({ error: 'Error adding item' });
  }
});

// DELETE /api/sessions/:sessionId/items/:itemId - remove item
router.delete('/:sessionId/items/:itemId', (req: Request, res: Response) => {
  try {
    const { sessionId, itemId } = req.params;
    const item = db.prepare('SELECT id FROM count_items WHERE id = ? AND session_id = ?').get(Number(itemId), Number(sessionId));
    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    db.prepare('DELETE FROM count_items WHERE id = ?').run(Number(itemId));
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting item' });
  }
});

export default router;
