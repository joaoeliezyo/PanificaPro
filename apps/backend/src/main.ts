import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('PanificaPro API')
    .setDescription('API para gerenciamento de produção de padarias (Monolito Modular)')
    .setVersion('1.0')
    .addTag('units', 'Gerenciamento de Unidades e Setores')
    .addTag('auth', 'Autenticação e PIN')
    .addTag('seed', 'Dados para desenvolvimento')
    .addHeader('x-tenant-id', 'ID do Tenant para isolamento de dados')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors();
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📖 Swagger documentation: http://localhost:${port}/docs`);
}
bootstrap();
