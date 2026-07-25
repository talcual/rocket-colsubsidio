import { Router, Request, Response } from 'express';
import db from '../models/database';

const router = Router();

// GET /api/products - list all products (optionally search)
router.get('/', (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q?: string };
    let products;
    if (q) {
      const pattern = `%${q.toUpperCase()}%`;
      products = db.prepare(
        "SELECT id, code, name, unit, category FROM products WHERE active = 1 AND (UPPER(code) LIKE ? OR UPPER(name) LIKE ?) ORDER BY name LIMIT 50"
      ).all(pattern, pattern);
    } else {
      products = db.prepare('SELECT id, code, name, unit, category FROM products WHERE active = 1 ORDER BY name').all();
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving products' });
  }
});

// GET /api/products/:code - get product by code
router.get('/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const product = db.prepare(
      'SELECT id, code, name, unit, category FROM products WHERE UPPER(code) = ? AND active = 1'
    ).get(code.toUpperCase());
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving product' });
  }
});

// POST /api/products - create product
router.post('/', (req: Request, res: Response) => {
  try {
    const { code, name, unit, category } = req.body as {
      code: string; name: string; unit?: string; category?: string;
    };
    if (!code || !name) {
      res.status(400).json({ error: 'Code and name are required' });
      return;
    }
    const stmt = db.prepare(
      'INSERT INTO products (code, name, unit, category) VALUES (?, ?, ?, ?)'
    );
    const result = stmt.run(
      code.trim().toUpperCase(),
      name.trim(),
      (unit || 'UND').trim().toUpperCase(),
      category ? category.trim() : null
    );
    res.status(201).json({ id: result.lastInsertRowid, code, name, unit, category });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Product code already exists' });
    } else {
      res.status(500).json({ error: 'Error creating product' });
    }
  }
});

export default router;
