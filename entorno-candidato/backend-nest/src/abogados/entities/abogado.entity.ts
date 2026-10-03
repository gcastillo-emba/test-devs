import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CostoMensualAbogado } from '../../costos-mensuales/entities/costo-mensual-abogado.entity.js';
import { RegistroTrabajo } from '../../registros-trabajo/entities/registro-trabajo.entity.js';

@Entity('abogados')
export class Abogado {
  @PrimaryColumn()
  id: string;

  @Column()
  nombre: string;

  @Column({ type: 'varchar', nullable: true })
  nivel: string | null;

  @Column({ type: 'varchar', nullable: true })
  area: string | null;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => RegistroTrabajo, (registro) => registro.abogado)
  registros: RegistroTrabajo[];

  @OneToMany(() => CostoMensualAbogado, (costo) => costo.abogado)
  costos: CostoMensualAbogado[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
