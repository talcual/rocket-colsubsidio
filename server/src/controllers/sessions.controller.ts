import { BadRequestException, Body, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import db from '../models/database';

interface CreateSessionDto {
  employee_id: number;
  location?: string;
  notes?: string;
}

interface CloseSessionDto {
  notes?: string;
}

interface AddItemDto {
  product_code: string;
  quantity?: number;
  input_method?: string;
}

function parsePositiveInt(raw: string, fieldLabel: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(`Invalid ${fieldLabel}`);
  }
  return value;
}

@Controller('sessions')
export class SessionsController {
  @Get()
  listSessions(@Query('status') status?: string) {
    const allowedStatuses = ['open', 'closed'];
    if (status && !allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid status filter');
    }

    try {
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

      if (status) {
        query += ' AND cs.status = ?';
        params.push(status);
      }

      query += ' GROUP BY cs.id ORDER BY cs.started_at DESC LIMIT 100';
      return db.prepare(query).all(...params);
    } catch {
      throw new InternalServerErrorException('Error retrieving sessions');
    }
  }

  @Get('employee/:employeeId')
  listEmployeeSessions(
    @Param('employeeId') employeeId: string,
    @Query('status') status?: string,
  ) {
    const employeeIdNum = parsePositiveInt(employeeId, 'employee ID');
    const allowedStatuses = ['open', 'closed'];
    if (status && !allowedStatuses.includes(status)) {
      throw new BadRequestException('Invalid status filter');
    }

    try {
      let query = `
        SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
               cs.location, cs.status, cs.started_at, cs.ended_at, cs.notes,
               COUNT(ci.id) AS item_count
        FROM count_sessions cs
        JOIN employees e ON cs.employee_id = e.id
        LEFT JOIN count_items ci ON ci.session_id = cs.id
        WHERE cs.employee_id = ?
      `;
      const params: (string | number)[] = [employeeIdNum];

      if (status) {
        query += ' AND cs.status = ?';
        params.push(status);
      }

      query += ' GROUP BY cs.id ORDER BY cs.started_at DESC LIMIT 100';
      return db.prepare(query).all(...params);
    } catch {
      throw new InternalServerErrorException('Error retrieving sessions');
    }
  }

  @Get(':id')
  getSession(@Param('id') id: string) {
    const sessionId = parsePositiveInt(id, 'session ID');

    try {
      const session = db
        .prepare(`
          SELECT cs.id, cs.employee_id, e.code AS employee_code, e.name AS employee_name,
                 cs.location, cs.status, cs.started_at, cs.ended_at, cs.notes
          FROM count_sessions cs
          JOIN employees e ON cs.employee_id = e.id
          WHERE cs.id = ?
        `)
        .get(sessionId);

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      const items = db
        .prepare(
          `
          SELECT id, product_code, product_name, quantity, unit, input_method, created_at
          FROM count_items
          WHERE session_id = ?
          ORDER BY created_at DESC
        `,
        )
        .all(sessionId);

      return { ...(session as object), items };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error retrieving session');
    }
  }

  @Post()
  createSession(@Body() body: CreateSessionDto) {
    const employeeId = Number(body.employee_id);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      throw new BadRequestException('employee_id is required');
    }

    try {
      const employee = db
        .prepare('SELECT id FROM employees WHERE id = ? AND active = 1')
        .get(employeeId);

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const location = body.location || 'COCINA';
      const stmt = db.prepare(
        'INSERT INTO count_sessions (employee_id, location, notes) VALUES (?, ?, ?)',
      );
      const result = stmt.run(employeeId, location, body.notes || null);

      return { id: result.lastInsertRowid, employee_id: employeeId, location, status: 'open' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error creating session');
    }
  }

  @Put(':id/close')
  closeSession(@Param('id') id: string, @Body() body: CloseSessionDto) {
    const sessionId = parsePositiveInt(id, 'session ID');

    try {
      const session = db.prepare('SELECT id FROM count_sessions WHERE id = ?').get(sessionId);
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      db.prepare(
        "UPDATE count_sessions SET status = 'closed', ended_at = datetime('now'), notes = COALESCE(?, notes) WHERE id = ?",
      ).run(body.notes || null, sessionId);

      return { message: 'Session closed successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error closing session');
    }
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() body: AddItemDto) {
    const sessionId = parsePositiveInt(id, 'session ID');
    const productCode = body.product_code?.trim().toUpperCase();

    if (!productCode) {
      throw new BadRequestException('product_code is required');
    }

    try {
      const session = db
        .prepare('SELECT id, status FROM count_sessions WHERE id = ?')
        .get(sessionId) as { id: number; status: string } | undefined;

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.status === 'closed') {
        throw new BadRequestException('Cannot add items to a closed session');
      }

      const product = db
        .prepare('SELECT name, unit FROM products WHERE UPPER(code) = ?')
        .get(productCode) as { name: string; unit: string } | undefined;

      const quantity = body.quantity ?? 1;
      const inputMethod = body.input_method || 'manual';

      const stmt = db.prepare(
        'INSERT INTO count_items (session_id, product_code, product_name, quantity, unit, input_method) VALUES (?, ?, ?, ?, ?, ?)',
      );
      const result = stmt.run(
        sessionId,
        productCode,
        product ? product.name : null,
        quantity,
        product ? product.unit : null,
        inputMethod,
      );

      return {
        id: result.lastInsertRowid,
        session_id: sessionId,
        product_code: productCode,
        product_name: product ? product.name : null,
        quantity,
        unit: product ? product.unit : null,
        input_method: inputMethod,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('Error adding item');
    }
  }

  @Delete(':sessionId/items/:itemId')
  deleteItem(@Param('sessionId') sessionIdRaw: string, @Param('itemId') itemIdRaw: string) {
    const sessionId = parsePositiveInt(sessionIdRaw, 'session ID');
    const itemId = parsePositiveInt(itemIdRaw, 'item ID');

    try {
      const item = db
        .prepare('SELECT id FROM count_items WHERE id = ? AND session_id = ?')
        .get(itemId, sessionId);

      if (!item) {
        throw new NotFoundException('Item not found');
      }

      db.prepare('DELETE FROM count_items WHERE id = ?').run(itemId);
      return { message: 'Item deleted' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error deleting item');
    }
  }
}
