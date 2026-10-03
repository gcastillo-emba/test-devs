import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Abogado } from './entities/abogado.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Abogado])],
  exports: [TypeOrmModule.forFeature([Abogado])],
})
export class AbogadosModule {}
