import { useState, useEffect } from "react";
import type { Player, Settings, Game, RoundingMethod } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface Props {
  players: Player[];
  settings: Settings;
  useLocalStorage: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

interface GameSlot {
  playerId: number | null;
  playerName: string;
  gHandicap: number;
  calculatedHandicap: number;
  grossScore: string;
}

function applyRounding(value: number, method: RoundingMethod): number {
  switch (method) {
    case "ceil":
      return Math.ceil(value);
    case "floor":
      return Math.floor(value);
    default:
      return Math.round(value);
  }
}

const LOCAL_GAMES_KEY = "golf_games";

export default function GameResultsPage({
  players,
  settings,
  useLocalStorage,
  showToast,
}: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [gameDate, setGameDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [courseName, setCourseName] = useState("");
  const [slotCount, setSlotCount] = useState(settings.defaultPlayerCount);
  const [slots, setSlots] = useState<GameSlot[]>(
    Array.from({ length: 8 }, () => ({
      playerId: null,
      playerName: "",
      gHandicap: 0,
      calculatedHandicap: 0,
      grossScore: "",
    }))
  );

  // 경기 목록 로드
  useEffect(() => {
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

  const handleSelectPlayer = (index: number, playerId: string) => {
    const newSlots = [...slots];
    if (!playerId) {
      newSlots[index] = {
        playerId: null,
        playerName: "",
        gHandicap: 0,
        calculatedHandicap: 0,
        grossScore: "",
      };
    } else {
      const player = players.find((p) => p.id === parseInt(playerId));
      if (player) {
        newSlots[index] = {
          playerId: player.id,
          playerName: player.name,
          gHandicap: Number(player.gHandicap),
          calculatedHandicap: 0,
          grossScore: "",
        };
      }
    }
    setSlots(newSlots);
  };

  const activeSlots = slots.slice(0, slotCount);

  const getAvailablePlayers = (currentIndex: number) => {
    const selectedIds = activeSlots
      .filter((s, i) => i !== currentIndex && s.playerId !== null)
      .map((s) => s.playerId);
    return players.filter((p) => !selectedIds.includes(p.id));
  };

  // 핸디캡 + 넷스코어 계산 후 저장
  const handleSaveGame = async () => {
    const filled = activeSlots.filter((s) => s.playerId !== null);
    if (filled.length < 2) {
      showToast("최소 2명의 선수를 선택해주세요.", "error");
      return;
    }

    const hasScores = filled.some((s) => s.grossScore);
    if (!hasScores) {
      showToast("최소 한 명의 스코어를 입력해주세요.", "error");
      return;
    }

    // 핸디캡 계산
    const minHandicap = Math.min(...filled.map((s) => s.gHandicap));

    const gamePlayers = filled.map((s) => {
      const diff = s.gHandicap - minHandicap;
      const raw = diff * settings.handicapRatio;
      const calcHandicap = applyRounding(raw, settings.roundingMethod);
      const gross = parseInt(s.grossScore || "0");
      const net = gross > 0 ? gross - calcHandicap : undefined;

      return {
        playerId: s.playerId!,
        gHandicap: s.gHandicap,
        calculatedHandicap: calcHandicap,
        grossScore: gross > 0 ? gross : undefined,
        netScore: net,
      };
    });

    const gameData = {
      gameDate,
      courseName,
      handicapRatio: settings.handicapRatio,
      roundingMethod: settings.roundingMethod,
      players: gamePlayers,
    };

    try {
      if (useLocalStorage) {
        // 순위 계산
        const withRank = gamePlayers
          .filter((p) => p.netScore != null)
          .sort((a, b) => (a.netScore || 999) - (b.netScore || 999))
          .map((p, i) => ({ ...p, rank: i + 1 }));

        const localGame: Game = {
          id: Date.now(),
          gameDate,
          courseName,
          handicapRatio: settings.handicapRatio,
          roundingMethod: settings.roundingMethod,
          createdAt: new Date().toISOString(),
          gamePlayers: withRank.map((p) => ({
            ...p,
            player: players.find((pl) => pl.id === p.playerId),
          })),
        };

        const updated = [localGame, ...games];
        setGames(updated);
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(updated));
        showToast("경기 결과가 저장되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gameData),
        });
        if (res.ok) {
          const gamesRes = await fetch(`${API_BASE}/games`);
          setGames(await gamesRes.json());
          showToast("경기 결과가 저장되었습니다");
        }
      }

      setShowForm(false);
      // 폼 리셋
      setSlots(
        Array.from({ length: 8 }, () => ({
          playerId: null,
          playerName: "",
          gHandicap: 0,
          calculatedHandicap: 0,
          grossScore: "",
        }))
      );
    } catch {
      showToast("경기 저장 실패", "error");
    }
  };

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            🏆 경기 결과
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "✕ 닫기" : "➕ 경기 결과 입력"}
          </button>
        </div>

        {showForm && (
          <div
            style={{
              background: "#f9fbe7",
              padding: "1.5rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ marginBottom: "1rem" }}>📝 경기 결과 입력</h3>
            <div className="form-row">
              <div className="form-group">
                <label>경기 날짜</label>
                <input
                  className="form-control"
                  type="date"
                  value={gameDate}
                  onChange={(e) => setGameDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>골프장</label>
                <input
                  className="form-control"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="OO 컨트리클럽"
                />
              </div>
              <div className="form-group">
                <label>참가 인원</label>
                <select
                  className="form-control"
                  value={slotCount}
                  onChange={(e) => setSlotCount(parseInt(e.target.value))}
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}명
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 선수 선택 + 스코어 입력 */}
            <div style={{ marginTop: "1rem" }}>
              {activeSlots.map((slot, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.5rem",
                    padding: "0.5rem",
                    background: "white",
                    borderRadius: "8px",
                  }}
                >
                  <div className="player-slot-number">{index + 1}</div>
                  <select
                    className="form-control"
                    style={{ flex: 1 }}
                    value={slot.playerId?.toString() || ""}
                    onChange={(e) =>
                      handleSelectPlayer(index, e.target.value)
                    }
                  >
                    <option value="">-- 선수 선택 --</option>
                    {getAvailablePlayers(index).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (G핸디: {p.gHandicap})
                      </option>
                    ))}
                  </select>
                  {slot.playerId && (
                    <>
                      <span
                        style={{ fontSize: "0.85rem", color: "#666", minWidth: "80px" }}
                      >
                        G핸디: {slot.gHandicap}
                      </span>
                      <input
                        className="form-control"
                        type="number"
                        style={{ width: "100px" }}
                        placeholder="그로스"
                        value={slot.grossScore}
                        onChange={(e) => {
                          const newSlots = [...slots];
                          newSlots[index].grossScore = e.target.value;
                          setSlots(newSlots);
                        }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <button
                className="btn btn-accent"
                onClick={handleSaveGame}
                style={{ fontSize: "1rem", padding: "0.7rem 2rem" }}
              >
                🏆 결과 저장 & 순위 계산
              </button>
            </div>
          </div>
        )}

        {/* 경기 히스토리 */}
        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏌️</div>
            <div className="empty-state-text">
              아직 경기 기록이 없습니다. 경기 결과를 입력해주세요.
            </div>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.5rem",
                }}
              >
                <strong>
                  📅 {game.gameDate?.split("T")[0]}
                  {game.courseName && ` - ${game.courseName}`}
                </strong>
                <span style={{ fontSize: "0.8rem", color: "#999" }}>
                  비율: {Math.round(game.handicapRatio * 100)}% |{" "}
                  {game.roundingMethod === "round"
                    ? "반올림"
                    : game.roundingMethod === "ceil"
                    ? "올림"
                    : "버림"}
                </span>
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
                      .sort(
                        (a, b) =>
                          (a.rank || 999) - (b.rank || 999)
                      )
                      .map((gp, idx) => (
                        <tr key={idx}>
                          <td>
                            {gp.rank ? (
                              <span
                                className={`rank-badge rank-${
                                  gp.rank <= 3 ? gp.rank : "other"
                                }`}
                              >
                                {gp.rank}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <strong>
                              {gp.player?.name || `선수 ${gp.playerId}`}
                            </strong>
                          </td>
                          <td>{gp.gHandicap}</td>
                          <td>{gp.calculatedHandicap}</td>
                          <td>{gp.grossScore || "-"}</td>
                          <td>
                            <strong>{gp.netScore || "-"}</strong>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
