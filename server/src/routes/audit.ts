import { Router, Request, Response } from 'express';
import db from '../models/database';

const router = Router();

// GET /api/audit - compare count sessions with ERP data for a date
router.get('/', (req: Request, res: Response) => {
  try {
    const { date, session_id } = req.query as { date?: string; session_id?: string };

    if (session_id) {
      // Audit a specific session
      const session = db.prepare(`
        SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
               cs.location, cs.status, cs.started_at, cs.ended_at
        FROM count_sessions cs
        JOIN employees e ON cs.employee_id = e.id
        WHERE cs.id = ?
      `).get(Number(session_id));

      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const sessionDate = (session as { started_at: string }).started_at.substring(0, 10);

      // Aggregated counted quantities per product
      const countedItems = db.prepare(`
        SELECT product_code, product_name,
               SUM(quantity) AS counted_quantity,
               unit
        FROM count_items
        WHERE session_id = ?
        GROUP BY product_code
        ORDER BY product_code
      `).all(Number(session_id)) as Array<{
        product_code: string; product_name: string | null;
        counted_quantity: number; unit: string | null;
      }>;

      // ERP data for that date
      const erpItems = db.prepare(`
        SELECT product_code, product_name, expected_quantity, unit
        FROM erp_data
        WHERE report_date = ?
      `).all(sessionDate) as Array<{
        product_code: string; product_name: string | null;
        expected_quantity: number; unit: string | null;
      }>;

      const erpMap = new Map(erpItems.map(e => [e.product_code, e]));
      const countMap = new Map(countedItems.map(c => [c.product_code, c]));
      const allCodes = new Set([...erpMap.keys(), ...countMap.keys()]);

      const comparison = Array.from(allCodes).map(code => {
        const erp = erpMap.get(code);
        const counted = countMap.get(code);
        const expectedQty = erp ? erp.expected_quantity : 0;
        const countedQty = counted ? counted.counted_quantity : 0;
        const difference = countedQty - expectedQty;
        return {
          product_code: code,
          product_name: (counted?.product_name ?? erp?.product_name) || code,
          unit: counted?.unit ?? erp?.unit ?? 'UND',
          expected_quantity: expectedQty,
          counted_quantity: countedQty,
          difference,
          status: Math.abs(difference) < 0.01 ? 'match' : difference > 0 ? 'surplus' : 'deficit'
        };
      }).sort((a, b) => a.product_code.localeCompare(b.product_code));

      res.json({ session, comparison, date: sessionDate });
      return;
    }

    // Date-based audit (aggregate all sessions on that date)
    const targetDate = date || new Date().toISOString().substring(0, 10);

    const countedItems = db.prepare(`
      SELECT ci.product_code,
             COALESCE(ci.product_name, p.name) AS product_name,
             SUM(ci.quantity) AS counted_quantity,
             COALESCE(ci.unit, p.unit) AS unit
      FROM count_items ci
      JOIN count_sessions cs ON ci.session_id = cs.id
      LEFT JOIN products p ON UPPER(p.code) = ci.product_code
      WHERE DATE(cs.started_at) = ?
      GROUP BY ci.product_code
      ORDER BY ci.product_code
    `).all(targetDate) as Array<{
      product_code: string; product_name: string | null;
      counted_quantity: number; unit: string | null;
    }>;

    const erpItems = db.prepare(`
      SELECT product_code, product_name, expected_quantity, unit
      FROM erp_data WHERE report_date = ?
    `).all(targetDate) as Array<{
      product_code: string; product_name: string | null;
      expected_quantity: number; unit: string | null;
    }>;

    const erpMap = new Map(erpItems.map(e => [e.product_code, e]));
    const countMap = new Map(countedItems.map(c => [c.product_code, c]));
    const allCodes = new Set([...erpMap.keys(), ...countMap.keys()]);

    const comparison = Array.from(allCodes).map(code => {
      const erp = erpMap.get(code);
      const counted = countMap.get(code);
      const expectedQty = erp ? erp.expected_quantity : 0;
      const countedQty = counted ? counted.counted_quantity : 0;
      const difference = countedQty - expectedQty;
      return {
        product_code: code,
        product_name: (counted?.product_name ?? erp?.product_name) || code,
        unit: counted?.unit ?? erp?.unit ?? 'UND',
        expected_quantity: expectedQty,
        counted_quantity: countedQty,
        difference,
        status: Math.abs(difference) < 0.01 ? 'match' : difference > 0 ? 'surplus' : 'deficit'
      };
    }).sort((a, b) => a.product_code.localeCompare(b.product_code));

    const summary = {
      total: comparison.length,
      match: comparison.filter(c => c.status === 'match').length,
      surplus: comparison.filter(c => c.status === 'surplus').length,
      deficit: comparison.filter(c => c.status === 'deficit').length
    };

    res.json({ date: targetDate, comparison, summary });
  } catch (err) {
    res.status(500).json({ error: 'Error generating audit' });
  }
});

// POST /api/audit/erp - import ERP data for a date
router.post('/erp', (req: Request, res: Response) => {
  try {
    const { report_date, items } = req.body as {
      report_date: string;
      items: Array<{ product_code: string; product_name?: string; expected_quantity: number; unit?: string }>;
    };
    if (!report_date || !items || !Array.isArray(items)) {
      res.status(400).json({ error: 'report_date and items array are required' });
      return;
    }
    // Delete existing data for that date and replace
    db.prepare('DELETE FROM erp_data WHERE report_date = ?').run(report_date);
    const insertStmt = db.prepare(
      'INSERT INTO erp_data (product_code, product_name, expected_quantity, unit, report_date) VALUES (?, ?, ?, ?, ?)'
    );
    db.exec('BEGIN');
    try {
      for (const row of items) {
        insertStmt.run(
          row.product_code.trim().toUpperCase(),
          row.product_name || null,
          row.expected_quantity,
          row.unit || 'UND',
          report_date
        );
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    res.status(201).json({ message: `Imported ${items.length} ERP records for ${report_date}` });
  } catch (err) {
    res.status(500).json({ error: 'Error importing ERP data' });
  }
});

// GET /api/audit/analytics - consumption trends
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query as { days?: string };
    const numDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);

    const consumption = db.prepare(`
      SELECT ci.product_code,
             COALESCE(ci.product_name, p.name) AS product_name,
             COALESCE(ci.unit, p.unit, 'UND') AS unit,
             DATE(cs.started_at) AS count_date,
             SUM(ci.quantity) AS total_quantity
      FROM count_items ci
      JOIN count_sessions cs ON ci.session_id = cs.id
      LEFT JOIN products p ON UPPER(p.code) = ci.product_code
      WHERE cs.started_at >= datetime('now', '-' || ? || ' days')
        AND cs.status = 'closed'
      GROUP BY ci.product_code, DATE(cs.started_at)
      ORDER BY count_date DESC, total_quantity DESC
    `).all(numDays);

    const topProducts = db.prepare(`
      SELECT ci.product_code,
             COALESCE(ci.product_name, p.name) AS product_name,
             COALESCE(ci.unit, p.unit, 'UND') AS unit,
             SUM(ci.quantity) AS total_quantity,
             COUNT(DISTINCT cs.id) AS session_count
      FROM count_items ci
      JOIN count_sessions cs ON ci.session_id = cs.id
      LEFT JOIN products p ON UPPER(p.code) = ci.product_code
      WHERE cs.started_at >= datetime('now', '-' || ? || ' days')
        AND cs.status = 'closed'
      GROUP BY ci.product_code
      ORDER BY total_quantity DESC
      LIMIT 20
    `).all(numDays);

    const inputMethodStats = db.prepare(`
      SELECT input_method, COUNT(*) AS count
      FROM count_items ci
      JOIN count_sessions cs ON ci.session_id = cs.id
      WHERE cs.started_at >= datetime('now', '-' || ? || ' days')
      GROUP BY input_method
    `).all(numDays);

    res.json({ days: numDays, consumption, topProducts, inputMethodStats });
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving analytics' });
  }
});

export default router;
