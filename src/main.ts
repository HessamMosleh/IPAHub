import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationExceptionFilter, I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule, {
    logger: isProd
      ? ['error', 'warn', 'log'] // production
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Apply security middleware
  app.use(helmet());

  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new I18nValidationExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PCA Hub API')
    .setDescription('PCA Hub backend API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from /auth/login or /auth/refresh',
      },
      'access-token',
    )
    .build();

  const fullDocument = SwaggerModule.createDocument(app, swaggerConfig);

  const isAdminPath = (path: string) =>
    path === '/admin' || path.startsWith('/admin/');

  const filterDocument = (
    document: typeof fullDocument,
    includeAdmin: boolean,
  ) => {
    const paths = Object.fromEntries(
      Object.entries(document.paths ?? {}).filter(([path]) =>
        includeAdmin ? isAdminPath(path) : !isAdminPath(path),
      ),
    );

    const usedTags = new Set<string>();
    for (const pathItem of Object.values(paths)) {
      for (const operation of Object.values(pathItem ?? {})) {
        if (
          operation &&
          typeof operation === 'object' &&
          'tags' in operation &&
          Array.isArray(operation.tags)
        ) {
          for (const tag of operation.tags) {
            if (typeof tag === 'string') usedTags.add(tag);
          }
        }
      }
    }

    return {
      ...document,
      paths,
      tags: (document.tags ?? []).filter((tag) => usedTags.has(tag.name)),
    };
  };

  const publicDocument = {
    ...filterDocument(fullDocument, false),
    info: {
      title: 'PCA Hub API',
      description:
        'Public/client API. Use a Bearer access token from /auth/login or /auth/refresh.',
      version: '1.0',
    },
  };

  const adminDocument = {
    ...filterDocument(fullDocument, true),
    info: {
      title: 'PCA Hub Admin API',
      description:
        'Admin API. Requires an admin user and a Bearer access token.',
      version: '1.0',
    },
  };

  SwaggerModule.setup('docs', app, publicDocument);
  SwaggerModule.setup('docs/admin', app, adminDocument);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
