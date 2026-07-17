// Load apps/api/.env before anything reads process.env (PrismaService needs
// DATABASE_URL). In production the container gets real env vars; dotenv never
// overrides values that are already set.
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // All routes live under /api — the same prefix the Vite dev proxy and the
  // production nginx reverse proxy route to this service.
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`MBc360 API listening on http://localhost:${port}/api`);
}

void bootstrap();
