import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroTrabajo } from './entities/registro-trabajo.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([RegistroTrabajo])],
  exports: [TypeOrmModule.forFeature([RegistroTrabajo])],
})
export class RegistrosTrabajoModule {}
