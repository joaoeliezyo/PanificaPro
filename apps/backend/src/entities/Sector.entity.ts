import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SectorType } from '@panificapro/shared';
import { Unit } from './Unit.entity';

@Entity('sectors')
export class Sector {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SectorType,
  })
  type: SectorType;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  unitId: string;

  @ManyToOne(() => Unit, (unit) => unit.sectors)
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
