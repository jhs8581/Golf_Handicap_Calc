import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Game } from "./Game";
import { Player } from "./Player";

@Entity("game_players")
export class GamePlayer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  gameId: number;

  @Column()
  playerId: number;

  @Column("decimal", { precision: 5, scale: 1 })
  gHandicap: number;

  @Column("decimal", { precision: 5, scale: 1, default: 0 })
  calculatedHandicap: number;

  @Column({ nullable: true })
  grossScore: number;

  @Column({ nullable: true })
  netScore: number;

  @Column({ nullable: true })
  rank: number;

  @ManyToOne(() => Game, (game: Game) => game.gamePlayers)
  @JoinColumn({ name: "gameId" })
  game: Game;

  @ManyToOne(() => Player, (player: Player) => player.gamePlayers)
  @JoinColumn({ name: "playerId" })
  player: Player;
}
