// ===== 선수 =====
export interface Player {
  id: number;
  name: string;
  age?: number;
  department?: string;
  gHandicap: number;
  avgScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  records?: PlayerRecord[];
}

export interface PlayerRecord {
  id: number;
  playerId: number;
  recordDate: string;
  gHandicap: number;
  avgScore: number;
  memo?: string;
  createdAt: string;
}

// ===== 설정 =====
export type RoundingMethod = "round" | "ceil" | "floor";

export interface Settings {
  id?: number;
  handicapRatio: number;
  roundingMethod: RoundingMethod;
  defaultPlayerCount: number;
  maxPlayerCount: number;
}

// ===== 경기 =====
export interface Game {
  id: number;
  gameDate: string;
  courseName?: string;
  handicapRatio: number;
  roundingMethod: string;
  memo?: string;
  createdAt: string;
  gamePlayers: GamePlayer[];
}

export interface GamePlayer {
  id?: number;
  gameId?: number;
  playerId: number;
  gHandicap: number;
  calculatedHandicap: number;
  grossScore?: number;
  netScore?: number;
  rank?: number;
  player?: Player;
}

// ===== 핸디캡 계산 =====
export interface HandicapSlot {
  playerId: number | null;
  playerName: string;
  gHandicap: number;
  calculatedHandicap: number;
  grossScore?: number;
  netScore?: number;
}

// ===== 탭 =====
export type TabType = "settings" | "players" | "handicap" | "results";
