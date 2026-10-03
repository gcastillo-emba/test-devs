import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CostoMensualAbogado } from './entities/costo-mensual-abogado.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([CostoMensualAbogado])],
  exports: [TypeOrmModule.forFeature([CostoMensualAbogado])],
})
export class CostosMensualesModule {}
