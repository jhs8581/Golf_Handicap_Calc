import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Player } from "./Player";

@Entity("player_records")
export class PlayerRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerId: number;

  @Column("date")
  recordDate: Date;

  @Column("decimal", { precision: 5, scale: 1 })
  gHandicap: number;

  @Column("decimal", { precision: 5, scale: 1 })
  avgScore: number;

  @Column({ length: 500, nullable: true })
  memo: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Player, (player: Player) => player.records)
  @JoinColumn({ name: "playerId" })
  player: Player;
}
