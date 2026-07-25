import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { EmployeesController } from './controllers/employees.controller';
import { ProductsController } from './controllers/products.controller';
import { SessionsController } from './controllers/sessions.controller';
import { AuditController } from './controllers/audit.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    EmployeesController,
    ProductsController,
    SessionsController,
    AuditController,
  ],
  providers: [],
})
export class AppModule {}
