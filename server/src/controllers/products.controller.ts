import { BadRequestException, Body, ConflictException, Controller, Get, InternalServerErrorException, NotFoundException, Param, Post, Query } from '@nestjs/common';
import db from '../models/database';

interface CreateProductDto {
  code: string;
  name: string;
  unit?: string;
  category?: string;
}

@Controller('products')
export class ProductsController {
  @Get()
  listProducts(@Query('q') q?: string) {
    try {
      if (q) {
        const pattern = `%${q.toUpperCase()}%`;
        return db
          .prepare(
            "SELECT id, code, name, unit, category FROM products WHERE active = 1 AND (UPPER(code) LIKE ? OR UPPER(name) LIKE ?) ORDER BY name LIMIT 50",
          )
          .all(pattern, pattern);
      }

      return db
        .prepare('SELECT id, code, name, unit, category FROM products WHERE active = 1 ORDER BY name')
        .all();
    } catch {
      throw new InternalServerErrorException('Error retrieving products');
    }
  }

  @Get(':code')
  getByCode(@Param('code') code: string) {
    try {
      const product = db
        .prepare(
          'SELECT id, code, name, unit, category FROM products WHERE UPPER(code) = ? AND active = 1',
        )
        .get(code.toUpperCase());

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      return product;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Error retrieving product');
    }
  }

  @Post()
  createProduct(@Body() body: CreateProductDto) {
    const code = body.code?.trim().toUpperCase();
    const name = body.name?.trim();

    if (!code || !name) {
      throw new BadRequestException('Code and name are required');
    }

    const unit = (body.unit || 'UND').trim().toUpperCase();
    const category = body.category?.trim() || null;

    try {
      const stmt = db.prepare(
        'INSERT INTO products (code, name, unit, category) VALUES (?, ?, ?, ?)',
      );
      const result = stmt.run(code, name, unit, category);
      return { id: result.lastInsertRowid, code, name, unit, category };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('UNIQUE')) {
        throw new ConflictException('Product code already exists');
      }
      throw new InternalServerErrorException('Error creating product');
    }
  }
}
