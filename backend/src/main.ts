import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
async function bootstrap() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) throw new Error('DATABASE_URL and JWT_SECRET are required');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const origins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500').split(',').map(s=>s.trim());
  app.enableCors({ origin: origins, methods: ['GET','POST','PATCH','DELETE','OPTIONS'] });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
bootstrap();
