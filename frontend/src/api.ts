import axios from "axios";
import type { Player, PlayerRecord, Settings, Game } from "./types";

const api = axios.create({
  baseURL: "/api",
});

// ===== 설정 API =====
export const settingsApi = {
  get: () => api.get<Settings>("/settings").then((r) => r.data),
  save: (data: Partial<Settings>) =>
    api.put<Settings>("/settings", data).then((r) => r.data),
};

// ===== 선수 API =====
export const playerApi = {
  getAll: () => api.get<Player[]>("/players").then((r) => r.data),
  getOne: (id: number) => api.get<Player>(`/players/${id}`).then((r) => r.data),
  create: (data: Partial<Player>) =>
    api.post<Player>("/players", data).then((r) => r.data),
  update: (id: number, data: Partial<Player>) =>
    api.put<Player>(`/players/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/players/${id}`).then((r) => r.data),
  getRecords: (id: number) =>
    api.get<PlayerRecord[]>(`/players/${id}/records`).then((r) => r.data),
  addRecord: (id: number, data: Partial<PlayerRecord>) =>
    api.post<PlayerRecord>(`/players/${id}/records`, data).then((r) => r.data),
};

// ===== 경기 API =====
export const gameApi = {
  getAll: () => api.get<Game[]>("/games").then((r) => r.data),
  getOne: (id: number) => api.get<Game>(`/games/${id}`).then((r) => r.data),
  create: (data: any) => api.post<Game>("/games", data).then((r) => r.data),
};
