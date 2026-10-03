import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Abogado } from '../../abogados/entities/abogado.entity.js';

@Entity('registros_trabajo')
@Check('CK_registros_minutos_positivo', '"minutos" > 0')
@Index('idx_registros_abogado_id', ['abogado'])
@Index('idx_registros_fecha_trabajo', ['fechaTrabajo'])
@Index('idx_registros_abogado_fecha', ['abogado', 'fechaTrabajo'])
@Index('idx_registros_facturable', ['facturable'])
export class RegistroTrabajo {
  @PrimaryColumn()
  id: string;

  // String relation + type-only import: keeps this entity free of a runtime
  // import cycle with Abogado (ESM TDZ + emitDecoratorMetadata crash).
  @ManyToOne('Abogado', 'registros', { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'abogadoId' })
  abogado: Abogado;

  @Column({ type: 'date' })
  fechaTrabajo: string;

  @Column({ type: 'date' })
  fechaCarga: string;

  @Column({ type: 'int' })
  minutos: number;

  @Column({ type: 'boolean' })
  facturable: boolean;

  @Column()
  cliente: string;

  @Column()
  asunto: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
