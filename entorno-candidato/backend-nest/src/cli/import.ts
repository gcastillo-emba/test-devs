import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { ImportacionDatosService } from '../importacion/importacion-datos.service.js';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const service = app.get(ImportacionDatosService);
    const summary = await service.run();
    console.log(JSON.stringify(summary, null, 2));
    if (summary.invalid.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
