import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { Player, Game, GamePlayer } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const LOCAL_GAMES_KEY = "golf_games";
const MAX_SELECT = 4;

const PLAYER_COLORS = ["#2e7d32", "#1565c0", "#e65100", "#6a1b9a"];

interface Props {
  players: Player[];
  useLocalStorage: boolean;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export default function StatsPage({ players, useLocalStorage, showToast }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

  // 활성 선수만 (isActive)
  const activePlayers = useMemo(
    () => players.filter((p) => p.isActive),
    [players]
  );

  // 선수 선택 토글
  const togglePlayer = (playerId: number) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= MAX_SELECT) {
        showToast(`최대 ${MAX_SELECT}명까지 선택 가능합니다.`, "error");
        return prev;
      }
      return [...prev, playerId];
    });
  };

  // 스코어가 입력된(완료된) 경기만
  const completedGames = useMemo(
    () =>
      games.filter((g) =>
        (g.gamePlayers || []).some((gp) => gp.grossScore && gp.grossScore > 0)
      ),
    [games]
  );

  // 선택한 선수들이 모두 참여한 경기 (교집합)
  const filteredGames = useMemo(() => {
    if (selectedPlayerIds.length === 0) return [];
    return completedGames
      .filter((game) => {
        const playerIdsInGame = (game.gamePlayers || []).map((gp) => gp.playerId);
        return selectedPlayerIds.every((id) => playerIdsInGame.includes(id));
      })
      .sort(
        (a, b) =>
          new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()
      );
  }, [completedGames, selectedPlayerIds]);

  // 개별 선수 전체 통계 (1명 선택 시)
  const singlePlayerStats = useMemo(() => {
    if (selectedPlayerIds.length !== 1) return null;
    const pid = selectedPlayerIds[0];
    const playerGames = completedGames
      .filter((g) =>
        (g.gamePlayers || []).some(
          (gp) => gp.playerId === pid && gp.grossScore && gp.grossScore > 0
        )
      )
      .sort(
        (a, b) =>
          new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()
      );

    let wins = 0;
    let losses = 0;
    let totalGross = 0;
    let totalNet = 0;
    let bestGross = Infinity;
    let bestNet = Infinity;
    let count = 0;

    const chartData = playerGames.map((game) => {
      const gp = (game.gamePlayers || []).find((g) => g.playerId === pid)!;
      const gross = gp.grossScore || 0;
      const net = gp.netScore || 0;
      const totalPlayers = (game.gamePlayers || []).filter(
        (g) => g.grossScore && g.grossScore > 0
      ).length;

      if (gp.rank === 1) wins++;
      else losses++;

      totalGross += gross;
      totalNet += net;
      if (gross < bestGross) bestGross = gross;
      if (net < bestNet) bestNet = net;
      count++;

      return {
        date: game.gameDate?.split("T")[0]?.slice(5) || "",
        fullDate: game.gameDate?.split("T")[0] || "",
        courseName: game.courseName || "",
        grossScore: gross,
        netScore: net,
        rank: gp.rank || "-",
        totalPlayers,
        handicap: gp.calculatedHandicap,
        gHandicap: gp.gHandicap,
      };
    });

    return {
      wins,
      losses,
      totalGames: count,
      avgGross: count > 0 ? Math.round((totalGross / count) * 10) / 10 : 0,
      avgNet: count > 0 ? Math.round((totalNet / count) * 10) / 10 : 0,
      bestGross: bestGross === Infinity ? 0 : bestGross,
      bestNet: bestNet === Infinity ? 0 : bestNet,
      chartData,
    };
  }, [selectedPlayerIds, completedGames]);

  // 다수 선수 교집합 경기 데이터
  const multiPlayerData = useMemo(() => {
    if (selectedPlayerIds.length < 2) return null;

    // 각 선수별 승/패 집계
    const stats: Record<
      number,
      { wins: number; losses: number; games: number }
    > = {};
    selectedPlayerIds.forEach((id) => {
      stats[id] = { wins: 0, losses: 0, games: 0 };
    });

    const chartData = filteredGames.map((game) => {
      const row: any = {
        date: game.gameDate?.split("T")[0]?.slice(5) || "",
        fullDate: game.gameDate?.split("T")[0] || "",
        courseName: game.courseName || "",
      };

      selectedPlayerIds.forEach((pid) => {
        const gp = (game.gamePlayers || []).find((g) => g.playerId === pid);
        if (gp && gp.grossScore) {
          row[`gross_${pid}`] = gp.grossScore;
          row[`net_${pid}`] = gp.netScore;
          row[`rank_${pid}`] = gp.rank;
          row[`handicap_${pid}`] = gp.calculatedHandicap;
          stats[pid].games++;
          if (gp.rank === 1) stats[pid].wins++;
          else stats[pid].losses++;
        }
      });

      return row;
    });

    return { stats, chartData };
  }, [selectedPlayerIds, filteredGames]);

  const getPlayerName = (id: number) =>
    players.find((p) => p.id === id)?.name || `선수 ${id}`;

  return (
    <div>
      {/* 선수 선택 */}
      <div className="card">
        <h2 className="card-title">📊 전적 분석</h2>
        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.75rem" }}>
          선수를 선택하세요 (최대 {MAX_SELECT}명). 1명 선택 시 개인 기록, 2명 이상 선택 시 교집합 경기만 표시됩니다.
        </p>

        {/* 선택된 선수 태그 + 드롭다운 */}
        <div style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              border: "1.5px solid var(--border)",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              minHeight: "44px",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
              alignItems: "center",
              cursor: "pointer",
              background: "white",
            }}
          >
            {selectedPlayerIds.length === 0 && (
              <span style={{ color: "#aaa", fontSize: "0.9rem" }}>▼ 선수를 선택하세요...</span>
            )}
            {selectedPlayerIds.map((pid, idx) => (
              <span
                key={pid}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: `${PLAYER_COLORS[idx]}18`,
                  color: PLAYER_COLORS[idx],
                  border: `1.5px solid ${PLAYER_COLORS[idx]}`,
                }}
              >
                {getPlayerName(pid)}
                <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>G{players.find(p => p.id === pid)?.gHandicap}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlayer(pid); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: PLAYER_COLORS[idx], fontWeight: 700, fontSize: "0.9rem",
                    padding: "0 0.1rem", lineHeight: 1,
                  }}
                >×</button>
              </span>
            ))}
            {selectedPlayerIds.length > 0 && selectedPlayerIds.length < MAX_SELECT && (
              <span style={{ color: "#aaa", fontSize: "0.8rem" }}>▼ 추가 선택...</span>
            )}
          </div>

          {/* 드롭다운 목록 */}
          {dropdownOpen && (
            <>
              <div
                style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 99 }}
                onClick={() => setDropdownOpen(false)}
              />
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "white",
                  border: "1.5px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  zIndex: 100,
                  maxHeight: "300px",
                  overflowY: "auto",
                  marginTop: "4px",
                }}
              >
                {activePlayers.length === 0 ? (
                  <div style={{ padding: "1rem", color: "#999", textAlign: "center", fontSize: "0.9rem" }}>
                    등록된 활성 선수가 없습니다.
                  </div>
                ) : (
                  activePlayers.map((player) => {
                    const isSelected = selectedPlayerIds.includes(player.id);
                    const colorIdx = selectedPlayerIds.indexOf(player.id);
                    const isDisabled = !isSelected && selectedPlayerIds.length >= MAX_SELECT;
                    return (
                      <div
                        key={player.id}
                        onClick={() => {
                          if (!isDisabled) {
                            togglePlayer(player.id);
                          }
                        }}
                        style={{
                          padding: "0.6rem 1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: isDisabled ? "not-allowed" : "pointer",
                          background: isSelected
                            ? `${PLAYER_COLORS[colorIdx]}10`
                            : "transparent",
                          opacity: isDisabled ? 0.4 : 1,
                          borderBottom: "1px solid #f0f0f0",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isDisabled && !isSelected)
                            (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = isSelected
                            ? `${PLAYER_COLORS[colorIdx]}10`
                            : "transparent";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              border: isSelected
                                ? `2px solid ${PLAYER_COLORS[colorIdx]}`
                                : "2px solid #ccc",
                              background: isSelected ? PLAYER_COLORS[colorIdx] : "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              color: "white",
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && "✓"}
                          </span>
                          <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: "0.9rem" }}>
                            {player.name}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#999" }}>
                          G핸디 {player.gHandicap} · 평균 {player.avgScore}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {selectedPlayerIds.length > 0 && (
          <button
            className="btn btn-sm"
            style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#999" }}
            onClick={() => setSelectedPlayerIds([])}
          >
            ✕ 선택 초기화
          </button>
        )}
      </div>

      {/* 선택 없을 때 */}
      {selectedPlayerIds.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <div className="empty-state-text">
              위에서 선수를 선택하면 전적과 스코어 그래프를 확인할 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* ===== 1명 선택: 개인 기록 ===== */}
      {selectedPlayerIds.length === 1 && singlePlayerStats && (
        <>
          {/* 요약 통계 */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
              🏅 {getPlayerName(selectedPlayerIds[0])} 개인 기록
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <StatBox label="총 경기" value={`${singlePlayerStats.totalGames}회`} color="#333" />
              <StatBox
                label="승"
                value={`${singlePlayerStats.wins}승`}
                color="#2e7d32"
              />
              <StatBox
                label="패"
                value={`${singlePlayerStats.losses}패`}
                color="#c62828"
              />
              <StatBox
                label="승률"
                value={
                  singlePlayerStats.totalGames > 0
                    ? `${Math.round(
                        (singlePlayerStats.wins / singlePlayerStats.totalGames) * 100
                      )}%`
                    : "-"
                }
                color="#1565c0"
              />
              <StatBox
                label="평균 그로스"
                value={`${singlePlayerStats.avgGross}`}
                color="#e65100"
              />
              <StatBox
                label="평균 넷"
                value={`${singlePlayerStats.avgNet}`}
                color="#6a1b9a"
              />
              <StatBox
                label="베스트 그로스"
                value={`${singlePlayerStats.bestGross}`}
                color="#00695c"
              />
              <StatBox
                label="베스트 넷"
                value={`${singlePlayerStats.bestNet}`}
                color="#4527a0"
              />
            </div>
          </div>

          {/* 스코어 추이 그래프 */}
          {singlePlayerStats.chartData.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                📈 스코어 추이 (그로스 vs 넷스코어)
              </h3>
              <div className="chart-container" style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={singlePlayerStats.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={["auto", "auto"]} fontSize={12} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: "white",
                              border: "1px solid #ddd",
                              borderRadius: "8px",
                              padding: "0.75rem",
                              fontSize: "0.85rem",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>
                              📅 {d.fullDate} {d.courseName && `(${d.courseName})`}
                            </div>
                            <div>그로스: <strong>{d.grossScore}타</strong></div>
                            <div>핸디캡: {d.handicap} (G핸디: {d.gHandicap})</div>
                            <div>넷스코어: <strong>{d.netScore}타</strong></div>
                            <div>순위: {d.rank}위 / {d.totalPlayers}명</div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="grossScore"
                      name="그로스"
                      stroke="#e65100"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netScore"
                      name="넷스코어"
                      stroke="#1565c0"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 경기 상세 기록 */}
          {singlePlayerStats.chartData.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                📋 경기별 상세 기록
              </h3>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>코스</th>
                      <th>G핸디</th>
                      <th>핸디캡</th>
                      <th>그로스</th>
                      <th>넷</th>
                      <th>순위</th>
                      <th>결과</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...singlePlayerStats.chartData].reverse().map((d, i) => (
                      <tr key={i}>
                        <td>{d.fullDate}</td>
                        <td>{d.courseName || "-"}</td>
                        <td>{d.gHandicap}</td>
                        <td>{d.handicap}</td>
                        <td>{d.grossScore}</td>
                        <td><strong>{d.netScore}</strong></td>
                        <td>
                          <span
                            className={`rank-badge rank-${
                              typeof d.rank === "number" && d.rank <= 3
                                ? d.rank
                                : "other"
                            }`}
                          >
                            {d.rank}
                          </span>
                        </td>
                        <td>
                          {d.rank === 1 ? (
                            <span style={{ color: "#2e7d32", fontWeight: 700 }}>🏆 승</span>
                          ) : (
                            <span style={{ color: "#999" }}>패</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== 2~4명 선택: 교집합 경기 ===== */}
      {selectedPlayerIds.length >= 2 && multiPlayerData && (
        <>
          {/* 승패 요약 */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
              🤼 {selectedPlayerIds.map(getPlayerName).join(" vs ")} 전적
              <span style={{ fontSize: "0.8rem", fontWeight: 400, color: "#999", marginLeft: "0.5rem" }}>
                (교집합 {filteredGames.length}경기)
              </span>
            </h3>

            {filteredGames.length === 0 ? (
              <div className="empty-state" style={{ padding: "2rem" }}>
                <div className="empty-state-icon">🤷</div>
                <div className="empty-state-text">
                  선택한 선수들이 함께 뛴 경기가 없습니다.
                </div>
              </div>
            ) : (
              <>
                {/* 승/패 비교 바 차트 */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${selectedPlayerIds.length}, 1fr)`,
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {selectedPlayerIds.map((pid, idx) => {
                    const s = multiPlayerData.stats[pid];
                    const winRate =
                      s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
                    return (
                      <div
                        key={pid}
                        style={{
                          textAlign: "center",
                          padding: "1rem",
                          borderRadius: "12px",
                          border: `2px solid ${PLAYER_COLORS[idx]}`,
                          background: `${PLAYER_COLORS[idx]}08`,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            color: PLAYER_COLORS[idx],
                            marginBottom: "0.5rem",
                          }}
                        >
                          {getPlayerName(pid)}
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: PLAYER_COLORS[idx] }}>
                          {s.wins}승 {s.losses}패
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#999", marginTop: "0.25rem" }}>
                          승률 {winRate}%
                        </div>
                        <div
                          style={{
                            marginTop: "0.5rem",
                            height: "8px",
                            background: "#eee",
                            borderRadius: "4px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${winRate}%`,
                              height: "100%",
                              background: PLAYER_COLORS[idx],
                              borderRadius: "4px",
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 승수 비교 바 차트 */}
                <div style={{ height: "200px", marginBottom: "1rem" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={selectedPlayerIds.map((pid, idx) => ({
                        name: getPlayerName(pid),
                        wins: multiPlayerData.stats[pid].wins,
                        losses: multiPlayerData.stats[pid].losses,
                        color: PLAYER_COLORS[idx],
                      }))}
                      layout="vertical"
                      margin={{ left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis type="category" dataKey="name" fontSize={13} width={55} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="wins" name="승" stackId="a" fill="#4caf50" />
                      <Bar dataKey="losses" name="패" stackId="a" fill="#ef9a9a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* 넷스코어 추이 비교 그래프 */}
          {multiPlayerData.chartData.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                📈 넷스코어 추이 비교
              </h3>
              <div className="chart-container" style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={multiPlayerData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={["auto", "auto"]} fontSize={12} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: "white",
                              border: "1px solid #ddd",
                              borderRadius: "8px",
                              padding: "0.75rem",
                              fontSize: "0.85rem",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>
                              📅 {d.fullDate} {d.courseName && `(${d.courseName})`}
                            </div>
                            {selectedPlayerIds.map((pid, idx) => (
                              <div key={pid} style={{ color: PLAYER_COLORS[idx] }}>
                                {getPlayerName(pid)}: 넷 <strong>{d[`net_${pid}`] || "-"}</strong>
                                {" "}(그로스 {d[`gross_${pid}`] || "-"}, {d[`rank_${pid}`]}위)
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    {selectedPlayerIds.map((pid, idx) => (
                      <Line
                        key={pid}
                        type="monotone"
                        dataKey={`net_${pid}`}
                        name={`${getPlayerName(pid)} (넷)`}
                        stroke={PLAYER_COLORS[idx]}
                        strokeWidth={2}
                        dot={{ r: 5 }}
                        activeDot={{ r: 7 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 그로스 추이 비교 그래프 */}
          {multiPlayerData.chartData.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                📉 그로스(실제타수) 추이 비교
              </h3>
              <div className="chart-container" style={{ height: "350px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={multiPlayerData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis domain={["auto", "auto"]} fontSize={12} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || payload.length === 0) return null;
                        const d = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: "white",
                              border: "1px solid #ddd",
                              borderRadius: "8px",
                              padding: "0.75rem",
                              fontSize: "0.85rem",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            }}
                          >
                            <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>
                              📅 {d.fullDate} {d.courseName && `(${d.courseName})`}
                            </div>
                            {selectedPlayerIds.map((pid, idx) => (
                              <div key={pid} style={{ color: PLAYER_COLORS[idx] }}>
                                {getPlayerName(pid)}: 그로스 <strong>{d[`gross_${pid}`] || "-"}</strong>
                                {" "}(핸디 {d[`handicap_${pid}`] || "-"})
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    {selectedPlayerIds.map((pid, idx) => (
                      <Line
                        key={pid}
                        type="monotone"
                        dataKey={`gross_${pid}`}
                        name={`${getPlayerName(pid)} (그로스)`}
                        stroke={PLAYER_COLORS[idx]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 교집합 경기 상세 테이블 */}
          {filteredGames.length > 0 && (
            <div className="card">
              <h3 className="card-title" style={{ fontSize: "1.1rem" }}>
                📋 교집합 경기 상세
              </h3>
              <div className="table-wrapper">
                <table style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ background: "#455a64", color: "white", verticalAlign: "middle" }}>날짜</th>
                      <th rowSpan={2} style={{ background: "#455a64", color: "white", verticalAlign: "middle" }}>코스</th>
                      {selectedPlayerIds.map((pid, idx) => (
                        <th
                          key={pid}
                          colSpan={3}
                          style={{
                            background: PLAYER_COLORS[idx],
                            color: "white",
                            fontSize: "0.95rem",
                            borderLeft: "2px solid white",
                          }}
                        >
                          {getPlayerName(pid)}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {selectedPlayerIds.map((pid, idx) => {
                        const lightBg = `${PLAYER_COLORS[idx]}25`;
                        return (
                          <React.Fragment key={`sub-${pid}`}>
                            <th style={{ fontSize: "0.75rem", background: lightBg, color: "#333", borderLeft: "2px solid white" }}>그로스</th>
                            <th style={{ fontSize: "0.75rem", background: lightBg, color: "#333" }}>넷</th>
                            <th style={{ fontSize: "0.75rem", background: lightBg, color: "#333" }}>순위</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredGames].reverse().map((game) => {
                      const gpList = selectedPlayerIds.map((pid) =>
                        (game.gamePlayers || []).find((gp) => gp.playerId === pid)
                      );
                      const minRank = Math.min(
                        ...gpList.map((gp) => gp?.rank || 999)
                      );

                      return (
                        <tr key={game.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{game.gameDate?.split("T")[0]}</td>
                          <td>{game.courseName || "-"}</td>
                          {selectedPlayerIds.map((pid, idx) => {
                            const gp = (game.gamePlayers || []).find(
                              (g) => g.playerId === pid
                            );
                            const isWinner =
                              gp?.rank != null && gp.rank === minRank && gp.rank === 1;
                            const cellBg = idx % 2 === 1 ? "#f8f9fa" : "transparent";
                            return (
                              <React.Fragment key={`data-${game.id}-${pid}`}>
                                <td style={{ background: cellBg, borderLeft: `2px solid ${PLAYER_COLORS[idx]}20` }}>{gp?.grossScore || "-"}</td>
                                <td style={{ background: cellBg }}>
                                  <strong>{gp?.netScore || "-"}</strong>
                                </td>
                                <td style={{ background: cellBg }}>
                                  {gp?.rank ? (
                                    <span
                                      className={`rank-badge rank-${
                                        gp.rank <= 3 ? gp.rank : "other"
                                      }`}
                                      style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}
                                    >
                                      {gp.rank}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                  {isWinner && " 🏆"}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 통계 박스 컴포넌트
function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "1rem 0.5rem",
        borderRadius: "10px",
        background: `${color}08`,
        border: `1px solid ${color}30`,
      }}
    >
      <div style={{ fontSize: "0.75rem", color: "#999", marginBottom: "0.25rem" }}>
        {label}
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
