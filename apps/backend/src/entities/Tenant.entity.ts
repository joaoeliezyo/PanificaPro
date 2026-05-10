import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants', { schema: 'public' }) // Tenants ficam no schema public
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  domain: string; // ex: padaria-silva

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  dbSchema: string; // Nome do schema PostgreSQL (ex: tenant_padaria_silva)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
