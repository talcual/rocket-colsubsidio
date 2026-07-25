import { BadRequestException, Body, ConflictException, Controller, Get, InternalServerErrorException, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import db from '../models/database';

interface LoginDto {
  code: string;
}

interface CreateEmployeeDto {
  code: string;
  name: string;
}

@Controller('employees')
export class EmployeesController {
  @Get()
  listEmployees() {
    try {
      return db
        .prepare('SELECT id, code, name FROM employees WHERE active = 1 ORDER BY name')
        .all();
    } catch {
      throw new InternalServerErrorException('Error retrieving employees');
    }
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    const code = body.code?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Employee code is required');
    }

    try {
      const employee = db
        .prepare('SELECT id, code, name FROM employees WHERE code = ? AND active = 1')
        .get(code);

      if (!employee) {
        throw new UnauthorizedException('Employee not found');
      }

      return employee;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException('Login error');
    }
  }

  @Post()
  createEmployee(@Body() body: CreateEmployeeDto) {
    const code = body.code?.trim().toUpperCase();
    const name = body.name?.trim();

    if (!code || !name) {
      throw new BadRequestException('Code and name are required');
    }

    try {
      const stmt = db.prepare('INSERT INTO employees (code, name) VALUES (?, ?)');
      const result = stmt.run(code, name);
      return { id: result.lastInsertRowid, code, name };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('UNIQUE')) {
        throw new ConflictException('Employee code already exists');
      }
      throw new InternalServerErrorException('Error creating employee');
    }
  }
}
