import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { GamePlayer } from "./GamePlayer";

@Entity("games")
export class Game {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("date")
  gameDate: Date;

  @Column({ length: 200, nullable: true })
  courseName: string;

  @Column("decimal", { precision: 3, scale: 2 })
  handicapRatio: number;

  @Column({ length: 10 })
  roundingMethod: string;

  @Column({ length: 500, nullable: true })
  memo: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => GamePlayer, (gp: GamePlayer) => gp.game)
  gamePlayers: GamePlayer[];
}
