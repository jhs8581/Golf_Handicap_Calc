const fs = require('fs');

const content = `import { useState, useEffect, useCallback } from "react";
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
      fetch(\`\${API_BASE}/games\`)
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
      showToast("\uCD5C\uC18C \uD55C \uBA85\uC758 \uC2A4\uCF54\uC5B4\uB97C \uC785\uB825\uD574\uC8FC\uC138\uC694.", "error");
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
        showToast("\uACBD\uAE30 \uACB0\uACFC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (\uB85C\uCEEC)");
      } else {
        const res = await fetch(\`\${API_BASE}/games/\${game.id}/scores\`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ players: filledPlayers }),
        });
        if (!res.ok) throw new Error("\uC800\uC7A5 \uC2E4\uD328");
        showToast("\uACBD\uAE30 \uACB0\uACFC\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4");
        loadGames();
      }
      setEditingGameId(null);
    } catch {
      showToast("\uACB0\uACFC \uC800\uC7A5 \uC2E4\uD328", "error");
    }
  };

  const handleDeleteGame = async (gameId: number) => {
    if (!confirm("\uC774 \uACBD\uAE30\uB97C \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;
    try {
      if (useLocalStorage) {
        const updated = games.filter((g) => g.id !== gameId);
        setGames(updated);
        localStorage.setItem(LOCAL_GAMES_KEY, JSON.stringify(updated));
        showToast("\uACBD\uAE30\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4 (\uB85C\uCEEC)");
      } else {
        const res = await fetch(\`\${API_BASE}/games/\${gameId}\`, { method: "DELETE" });
        if (!res.ok) throw new Error("\uC0AD\uC81C \uC2E4\uD328");
        showToast("\uACBD\uAE30\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4");
        loadGames();
      }
    } catch {
      showToast("\uACBD\uAE30 \uC0AD\uC81C \uC2E4\uD328", "error");
    }
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title" style={{ marginBottom: "1rem" }}>\uD83C\uDFC6 \uACBD\uAE30 \uACB0\uACFC</h2>

        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">\uD83C\uDFCC\uFE0F</div>
            <div className="empty-state-text">
              \uC544\uC9C1 \uACBD\uAE30 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.<br />
              "\uD578\uB514\uCEA1 \uACC4\uC0B0" \uD0ED\uC5D0\uC11C \uACC4\uC0B0 \uD6C4 \uACBD\uAE30\uB97C \uB4F1\uB85D\uD574\uC8FC\uC138\uC694.
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
                  border: \`2px solid \${pending ? "#ff9800" : "var(--border)"}\`,
                  borderRadius: "8px",
                  padding: "1rem",
                  marginBottom: "1rem",
                  background: pending ? "#fff8e1" : "white",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div>
                    <strong style={{ fontSize: "1.05rem" }}>
                      \uD83D\uDCC5 {game.gameDate?.split("T")[0]}
                      {game.courseName && \` - \${game.courseName}\`}
                    </strong>
                    {pending && (
                      <span style={{ marginLeft: "0.75rem", background: "#ff9800", color: "white", padding: "0.15rem 0.5rem", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 600 }}>
                        \u23F3 \uC2A4\uCF54\uC5B4 \uBBF8\uC785\uB825
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#999" }}>
                      \uBE44\uC728: {Math.round(game.handicapRatio * 100)}% |{" "}
                      {game.roundingMethod === "round" ? "\uBC18\uC62C\uB9BC" : game.roundingMethod === "ceil" ? "\uC62C\uB9BC" : "\uBC84\uB9BC"}
                    </span>
                    <button
                      className="btn"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", background: "#ffebee", color: "#c62828", border: "1px solid #ef9a9a" }}
                      onClick={() => handleDeleteGame(game.id)}
                    >\uD83D\uDDD1</button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>\uC21C\uC704</th>
                        <th>\uC120\uC218</th>
                        <th>G\uD578\uB514</th>
                        <th>\uD578\uB514\uCEA1</th>
                        <th>\uADF8\uB85C\uC2A4</th>
                        <th>\uB137\uC2A4\uCF54\uC5B4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(game.gamePlayers || [])
                        .sort((a, b) => pending ? a.calculatedHandicap - b.calculatedHandicap : (a.rank || 999) - (b.rank || 999))
                        .map((gp, idx) => (
                          <tr key={idx}>
                            <td>
                              {gp.rank ? (
                                <span className={\`rank-badge rank-\${gp.rank <= 3 ? gp.rank : "other"}\`}>{gp.rank}</span>
                              ) : "-"}
                            </td>
                            <td><strong>{gp.player?.name || \`\uC120\uC218 \${gp.playerId}\`}</strong></td>
                            <td>{gp.gHandicap}</td>
                            <td>{gp.calculatedHandicap}</td>
                            <td>
                              {isEditing ? (
                                <input
                                  type="number"
                                  className="form-control"
                                  style={{ width: "80px" }}
                                  placeholder="\uD0C0\uC218"
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
                      \u270F\uFE0F \uC2A4\uCF54\uC5B4 \uC785\uB825
                    </button>
                  </div>
                )}
                {isEditing && (
                  <div style={{ marginTop: "0.75rem", textAlign: "center", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                    <button className="btn btn-accent" onClick={() => handleSaveScores(game)} style={{ padding: "0.6rem 2rem" }}>
                      \uD83C\uDFC6 \uACB0\uACFC \uC800\uC7A5 & \uC21C\uC704 \uACC4\uC0B0
                    </button>
                    <button className="btn" onClick={() => setEditingGameId(null)} style={{ padding: "0.6rem 1.5rem" }}>
                      \uCDE8\uC18C
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
`;

fs.writeFileSync(
  'C:/Users/A67827/source/repos/Golf_Handicap_Calc/frontend/src/pages/GameResultsPage.tsx',
  content,
  'utf8'
);
console.log('Done');
