import { Module } from '@nestjs/common';
import { AbogadosModule } from '../abogados/abogados.module.js';
import { CostosMensualesModule } from '../costos-mensuales/costos-mensuales.module.js';
import { RegistrosTrabajoModule } from '../registros-trabajo/registros-trabajo.module.js';
import { ImportacionDatosService } from './importacion-datos.service.js';

@Module({
  imports: [AbogadosModule, RegistrosTrabajoModule, CostosMensualesModule],
  providers: [ImportacionDatosService],
  exports: [ImportacionDatosService],
})
export class ImportacionDatosModule {}
