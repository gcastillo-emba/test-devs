import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Abogado } from '../../abogados/entities/abogado.entity.js';

const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};

@Entity('costos_mensuales_abogado')
@Unique('UQ_costos_abogado_periodo', ['abogado', 'periodo'])
@Index('idx_costos_abogado_id', ['abogado'])
@Index('idx_costos_periodo', ['periodo'])
export class CostoMensualAbogado {
  @PrimaryGeneratedColumn()
  id: number;

  // String relation + type-only import: no runtime import cycle with Abogado.
  @ManyToOne('Abogado', 'costos', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'abogadoId' })
  abogado: Abogado;

  @Column({ type: 'varchar', length: 7 })
  periodo: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  sueldo: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  cargasSociales: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  gastosAsignados: number;

  @Column({ type: 'numeric', precision: 12, scale: 2, transformer: numericTransformer })
  costoTotal: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  horasFacturadasReportadas: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
