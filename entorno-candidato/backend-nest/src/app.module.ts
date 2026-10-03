import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnv } from './config/env.validation.js';
import { ImportacionDatosModule } from './importacion/importacion-datos.module.js';
import { InitBaseEntities1790980801808 } from './migrations/1790980801808-InitBaseEntities.js';
import { AnaliticaModule } from './modules/analitica/analitica.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [InitBaseEntities1790980801808],
        migrationsRun: false,
      }),
    }),
    ImportacionDatosModule,
    AnaliticaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
