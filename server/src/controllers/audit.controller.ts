import { BadRequestException, Body, Controller, Get, InternalServerErrorException, NotFoundException, Post, Query } from '@nestjs/common';
import db from '../models/database';

interface ImportErpDto {
  report_date: string;
  items: Array<{
    product_code: string;
    product_name?: string;
    expected_quantity: number;
    unit?: string;
  }>;
}

@Controller('audit')
export class AuditController {
  @Get()
  getAudit(@Query('date') date?: string, @Query('session_id') sessionId?: string) {
    try {
      if (sessionId) {
        return this.auditBySession(sessionId);
      }

      return this.auditByDate(date);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error generating audit');
    }
  }

  @Post('erp')
  importErp(@Body() body: ImportErpDto) {
    if (!body.report_date || !Array.isArray(body.items)) {
      throw new BadRequestException('report_date and items array are required');
    }

    try {
      db.prepare('DELETE FROM erp_data WHERE report_date = ?').run(body.report_date);
      const insertStmt = db.prepare(
        'INSERT INTO erp_data (product_code, product_name, expected_quantity, unit, report_date) VALUES (?, ?, ?, ?, ?)',
      );

      db.exec('BEGIN');
      try {
        for (const row of body.items) {
          insertStmt.run(
            row.product_code.trim().toUpperCase(),
            row.product_name || null,
            row.expected_quantity,
            row.unit || 'UND',
            body.report_date,
          );
        }
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }

      return { message: `Imported ${body.items.length} ERP records for ${body.report_date}` };
    } catch {
      throw new InternalServerErrorException('Error importing ERP data');
    }
  }

  @Get('analytics')
  getAnalytics(@Query('days') days = '30') {
    const numDays = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);

    try {
      const consumption = db
        .prepare(
          `
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
        `,
        )
        .all(numDays);

      const topProducts = db
        .prepare(
          `
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
        `,
        )
        .all(numDays);

      const inputMethodStats = db
        .prepare(
          `
          SELECT input_method, COUNT(*) AS count
          FROM count_items ci
          JOIN count_sessions cs ON ci.session_id = cs.id
          WHERE cs.started_at >= datetime('now', '-' || ? || ' days')
          GROUP BY input_method
        `,
        )
        .all(numDays);

      return { days: numDays, consumption, topProducts, inputMethodStats };
    } catch {
      throw new InternalServerErrorException('Error retrieving analytics');
    }
  }

  private auditBySession(sessionIdRaw: string) {
    const sessionId = Number(sessionIdRaw);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      throw new BadRequestException('Invalid session ID');
    }

    const session = db
      .prepare(
        `
        SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
               cs.location, cs.status, cs.started_at, cs.ended_at
        FROM count_sessions cs
        JOIN employees e ON cs.employee_id = e.id
        WHERE cs.id = ?
      `,
      )
      .get(sessionId) as { started_at: string } | undefined;

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionDate = session.started_at.substring(0, 10);

    const countedItems = db
      .prepare(
        `
        SELECT product_code, product_name,
               SUM(quantity) AS counted_quantity,
               unit
        FROM count_items
        WHERE session_id = ?
        GROUP BY product_code
        ORDER BY product_code
      `,
      )
      .all(sessionId) as Array<{
      product_code: string;
      product_name: string | null;
      counted_quantity: number;
      unit: string | null;
    }>;

    const erpItems = db
      .prepare(
        `
        SELECT product_code, product_name, expected_quantity, unit
        FROM erp_data
        WHERE report_date = ?
      `,
      )
      .all(sessionDate) as Array<{
      product_code: string;
      product_name: string | null;
      expected_quantity: number;
      unit: string | null;
    }>;

    const comparison = this.buildComparison(countedItems, erpItems);
    return { session, comparison, date: sessionDate };
  }

  private auditByDate(date?: string) {
    const targetDate = date || new Date().toISOString().substring(0, 10);

    const countedItems = db
      .prepare(
        `
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
      `,
      )
      .all(targetDate) as Array<{
      product_code: string;
      product_name: string | null;
      counted_quantity: number;
      unit: string | null;
    }>;

    const erpItems = db
      .prepare(
        `
        SELECT product_code, product_name, expected_quantity, unit
        FROM erp_data WHERE report_date = ?
      `,
      )
      .all(targetDate) as Array<{
      product_code: string;
      product_name: string | null;
      expected_quantity: number;
      unit: string | null;
    }>;

    const comparison = this.buildComparison(countedItems, erpItems);
    const summary = {
      total: comparison.length,
      match: comparison.filter((c) => c.status === 'match').length,
      surplus: comparison.filter((c) => c.status === 'surplus').length,
      deficit: comparison.filter((c) => c.status === 'deficit').length,
    };

    return { date: targetDate, comparison, summary };
  }

  private buildComparison(
    countedItems: Array<{
      product_code: string;
      product_name: string | null;
      counted_quantity: number;
      unit: string | null;
    }>,
    erpItems: Array<{
      product_code: string;
      product_name: string | null;
      expected_quantity: number;
      unit: string | null;
    }>,
  ) {
    const erpMap = new Map(erpItems.map((e) => [e.product_code, e]));
    const countMap = new Map(countedItems.map((c) => [c.product_code, c]));
    const allCodes = new Set([...erpMap.keys(), ...countMap.keys()]);

    return Array.from(allCodes)
      .map((code) => {
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
          status: Math.abs(difference) < 0.01 ? 'match' : difference > 0 ? 'surplus' : 'deficit',
        };
      })
      .sort((a, b) => a.product_code.localeCompare(b.product_code));
  }
}
