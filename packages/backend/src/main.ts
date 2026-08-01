import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { bodyParser: false });

    // 🛡️ Increase Payload Size for Multimodal (Docs/Images)
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));

    // Global Prefix
    app.setGlobalPrefix('api/v1');

    // 🛡️ Security: Helmet for Header Sanitization
    app.use(helmet());

    // 🍪 Cookie Parser (required for SSO cookie reading)
    app.use(cookieParser());


    // HTTPS enforcement is handled by the reverse proxy (nginx/ALB/etc),
    // not by the application. The backend always serves HTTP.
    // If you need HTTPS redirect, configure it in your reverse proxy.

    // CORS
    app.enableCors({
      origin: function (origin, callback) {
        if (!origin || origin === 'null' || origin === 'null') {
          callback(null, true);
          return;
        }
        // Allow localhost in development
        if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
          callback(null, true);
          return;
        }
        // Allow browser extensions (Chrome and Firefox)
        if (origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://')) {
          callback(null, true);
          return;
        }
        // Allow configured origin
        if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
          callback(null, true);
          return;
        }

        console.log('Blocked CORS origin:', origin);
        callback(null, false); // Return false instead of Error to avoid crashing hard, though error is standard
      },
      credentials: true,
    });

    // Global Validation Pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Swagger Documentation
    const config = new DocumentBuilder()
      .setTitle('Onefend API')
      .setDescription('Open-source AI security and governance platform')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = parseInt(process.env.PORT || '3000', 10);
    // Listen on 0.0.0.0 to accept external container traffic (GCP Requirement)
    await app.listen(port, '0.0.0.0');

    console.log(`🚀 Application is running on: http://0.0.0.0:${port}`);
    console.log(`📚 Swagger docs available at: http://0.0.0.0:${port}/api/docs`);
  } catch (error) {
    console.error('❌ Error starting application:', error);
    process.exit(1);
  }
}

bootstrap();
