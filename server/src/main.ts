import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import path from 'path';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
  });

  const staticLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);
  app.use('/api/employees/login', loginLimiter);

  if (process.env.NODE_ENV === 'production') {
    const staticPath = path.join(__dirname, '../../client/dist');
    app.use(staticLimiter);
    app.useStaticAssets(staticPath);
    app.getHttpAdapter().getInstance().get('*', staticLimiter, (_req: unknown, res: { sendFile: (file: string) => void }) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Rocket Colsubsidio server running on port ${port}`);
  // eslint-disable-next-line no-console
  console.log(`API available at http://localhost:${port}/api`);
}

void bootstrap();
