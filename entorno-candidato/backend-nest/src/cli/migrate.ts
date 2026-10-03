import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module.js';

async function main(): Promise<void> {
  const revert = process.argv.includes('down');
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const dataSource = app.get(DataSource);
    if (revert) {
      await dataSource.undoLastMigration();
      console.log('Last migration reverted.');
    } else {
      const executed = await dataSource.runMigrations();
      console.log(
        executed.length > 0
          ? `Executed migrations: ${executed.map((m) => m.name).join(', ')}`
          : 'No pending migrations.',
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
