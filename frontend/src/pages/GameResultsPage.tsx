import { useState, useEffect, useCallback } from "react";
import type { Player, Settings, Game } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface Props {
  players: Player[];
  settings: Settings;
  useLocalStorage: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const LOCAL_GAMES_KEY = "golf_games";

export default function GameResultsPage({
  players,
  settings,
  useLocalStorage,
  showToast,
}: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [scores, setScores] = useState<Record<number, string>>({});

  const loadGames = useCallback(() => {
    if (useLocalStorage) {
      const saved = localStorage.getItem(LOCAL_GAMES_KEY);
      if (saved) setGames(JSON.parse(saved));
    } else {
      fetch(`${API_BASE}/games`)
        .then((r) => r.json())
        .then(setGames)
        .catch(() => setGames([]));
    }
  }, [useLocalStorage]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const isScorePending = (game: Game) => {
    return (game.gamePlayers || []).every(
      (gp) => !gp.grossScore || gp.grossScore === 0
    );
  };

  const startScoreEdit = (game: Game) => {
    setEditingGameId(game.id);
    const initial: Record<number, string> = {};
    for (const gp of game.gamePlayers || []) {
      initial[gp.playerId] = gp.grossScore ? String(gp.grossScore) : "";
    }
    setScores(initial);
  };

  const handleSaveScores = async (game: Game) => {
    const filledPlayers = (game.gamePlayers || []).map((gp) => {
      const gross = parseInt(scores[gp.playerId] || "0");
      const net = gross > 0 ? gross - gp.calculatedHandicap : undefined;
      return {
        playerId: gp.playerId,
        gHandicap: gp.gHandicap,
        calculatedHandicap: gp.calculatedHandicap,
        grossScore: gross > 0 ? gross : undefined,
        netScore: net,
      };
    });

    const hasAnyScore = filledPlayers.some((p) => p.grossScore && p.grossScore > 0);
    if (!hasAnyScore) {
      showToast("최소 한 명의 스코어를 입력해주세요.", "error");
      return;
    }

    try {
      if (useLocalStorage) {
        const withRank = filledPlayers
          .filter((p) => p.netScore != null)
          .sort((a, b) => (a.netScore || 999) - (b.netScore || 999))
          .map((p, i) => ({ ...p, rank: i + 1 }));

        const updatedGames = games.map((g) => {
          if (g.id !== game.id) return g;
          return {
            ...g,
            gamePlayers: withRank.map((p) => ({
              ...p,
              player: players.find((pl) => pl.id === p.playerId),
            })),
          };
        });
        setGames(updatedGames);
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(updatedGames));
        showToast("경기 결과가 저장되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/games/${game.id}/scores`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players: filledPlayers }),
        });
        if (!res.ok) throw new Error("저장 실패");
        showToast("경기 결과가 저장되었습니다");
        loadGames();
      }
      setEditingGameId(null);
    } catch {
      showToast("결과 저장 실패", "error");
    }
  };

  const handleDeleteGame = async (gameId: number) => {
    if (!confirm("이 경기를 삭제하시겠습니까?")) return;
    try {
      if (useLocalStorage) {
        const updated = games.filter((g) => g.id !== gameId);
        setGames(updated);
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(updated));
        showToast("경기가 삭제되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/games/${gameId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("삭제 실패");
        showToast("경기가 삭제되었습니다");
        loadGames();
      }
    } catch {
      showToast("경기 삭제 실패", "error");
    }
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: "1rem" }}> 경기 결과</h2>

        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"></div>
            <div className="empty-state-text">
              아직 경기 기록이 없습니다.<br />
              "핸디캡 계산" 탭에서 계산 후 경기를 등록해주세요.
            </div>
          </div>
        ) : (
          games.map((game) => {
            const pending = isScorePending(game);
            const isEditing = editingGameId === game.id;
            return (
              <div
                key={game.id}
                style={{
                  border: `2px solid ${pending ? "#ff9800" : "var(--border)"}`,
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem",
                  background: pending ? "#fff8e1" : "white",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <strong style={{ fontSize: "1.05rem" }}>
                       {game.gameDate?.split("T")[0]}
                      {game.courseName && ` - ${game.courseName}`}
                    </strong>
                    {pending && (
                      <span style={{ marginLeft: "0.75rem", background: "#ff9800", color: "white", padding: "0.15rem 0.5rem", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600 }}>
                         스코어 미입력
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#999" }}>
                      비율: {Math.round(game.handicapRatio * 100)}% |{" "}
                      {game.roundingMethod === "round" ? "반올림" : game.roundingMethod === "ceil" ? "올림" : "버림"}
                    </span>
                    <button
                      className="btn"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" }}
                      onClick={() => handleDeleteGame(game.id)}
                    ></button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>순위</th>
                        <th>선수</th>
                        <th>G핸디</th>
                        <th>핸디캡</th>
                        <th>그로스</th>
                        <th>넷스코어</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(game.gamePlayers || [])
                        .sort((a, b) => pending ? a.calculatedHandicap - b.calculatedHandicap : (a.rank || 999) - (b.rank || 999))
                        .map((gp, idx) => (
                          <tr key={idx}>
                            <td>
                              {gp.rank ? (
                                <span className={`rank-badge rank-${gp.rank <= 3 ? gp.rank : "other"}`}>{gp.rank}</span>
                              ) : "-"}
                            </td>
                            <td><strong>{gp.player?.name || `선수 ${gp.playerId}`}</strong></td>
                            <td>{gp.gHandicap}</td>
                            <td>{gp.calculatedHandicap}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-control"
                                  style={{ width: "80px" }}
                                  placeholder="타수"
                                  value={scores[gp.playerId] || ""}
                                  onChange={(e) => setScores({ ...scores, [gp.playerId]: e.target.value })}
                                />
                              ) : (gp.grossScore || "-")}
                            </td>
                            <td>
                              {isEditing ? (
                                <span style={{ color: "#999" }}>
                                  {scores[gp.playerId] ? parseInt(scores[gp.playerId]) - gp.calculatedHandicap : "-"}
                                </span>
                              ) : (<strong>{gp.netScore || "-"}</strong>)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {pending && !isEditing && (
                  <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                    <button className="btn btn-accent" onClick={() => startScoreEdit(game)} style={{ padding: "0.6rem 2rem" }}>
                       스코어 입력
                    </button>
                  </div>
                )}
                {isEditing && (
                  <div style={{ marginTop: "0.75rem", textAlign: "center", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button className="btn btn-accent" onClick={() => handleSaveScores(game)} style={{ padding: "0.6rem 2rem" }}>
                       결과 저장 & 순위 계산
                    </button>
                    <button className="btn" onClick={() => setEditingGameId(null)} style={{ padding: "0.6rem 1.5rem" }}>
                      취소
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
