import { Module } from '@nestjs/common';
import { AbogadosModule } from '../../abogados/abogados.module.js';
import { CostosMensualesModule } from '../../costos-mensuales/costos-mensuales.module.js';
import { RegistrosTrabajoModule } from '../../registros-trabajo/registros-trabajo.module.js';
import { AnaliticaController } from './analitica.controller.js';
import { AnaliticaService } from './analitica.service.js';

@Module({
  imports: [AbogadosModule, RegistrosTrabajoModule, CostosMensualesModule],
  controllers: [AnaliticaController],
  providers: [AnaliticaService],
  exports: [AnaliticaService],
})
export class AnaliticaModule {}
