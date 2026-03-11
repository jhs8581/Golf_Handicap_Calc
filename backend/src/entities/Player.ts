import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PlayerRecord } from "./PlayerRecord";
import { GamePlayer } from "./GamePlayer";

@Entity("players")
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ nullable: true })
  age: number;

  @Column({ length: 100, nullable: true })
  department: string;

  @Column("decimal", { precision: 5, scale: 1, default: 0 })
  gHandicap: number;

  @Column("decimal", { precision: 5, scale: 1, default: 0 })
  avgScore: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PlayerRecord, (record: PlayerRecord) => record.player)
  records: PlayerRecord[];

  @OneToMany(() => GamePlayer, (gp: GamePlayer) => gp.player)
  gamePlayers: GamePlayer[];
}
