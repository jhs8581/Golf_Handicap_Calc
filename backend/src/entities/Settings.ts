import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from "typeorm";

@Entity("settings")
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("decimal", { precision: 3, scale: 2, default: 0.8 })
  handicapRatio: number;

  @Column({ length: 10, default: "round" })
  roundingMethod: string; // "round" | "ceil" | "floor"

  @Column({ default: 4 })
  defaultPlayerCount: number;

  @Column({ default: 8 })
  maxPlayerCount: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
