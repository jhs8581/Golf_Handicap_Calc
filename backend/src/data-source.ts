import { DataSource } from "typeorm";
import { Player } from "./entities/Player";
import { PlayerRecord } from "./entities/PlayerRecord";
import { Settings } from "./entities/Settings";
import { Game } from "./entities/Game";
import { GamePlayer } from "./entities/GamePlayer";

export const AppDataSource = new DataSource({
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "10533"),
  username: process.env.DB_USER || "sa",
  password: process.env.DB_PASS || "your_password",
  database: process.env.DB_NAME || "GolfHandicap",
  synchronize: true,
  logging: false,
  entities: [Player, PlayerRecord, Settings, Game, GamePlayer],
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
});
