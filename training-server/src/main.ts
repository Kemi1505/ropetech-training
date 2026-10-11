import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('FRONTEND_URL'),
    credentials: true, // required so browsers send/accept cookies
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // reject unknown fields
      transform: true, // run @Transform (email trimming/lowercasing)
    }),
  );

  // ---- Swagger (disabled in production) ----
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Training Platform API')
      .setDescription('Authentication and authorization endpoints')
      .setVersion('1.0')
      .addBearerAuth() // "Authorize" button for Authorization: Bearer <token>
      .addCookieAuth('access_token') // documents the cookie-based auth
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
