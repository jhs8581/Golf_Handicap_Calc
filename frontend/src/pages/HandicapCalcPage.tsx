import { useState, useMemo } from "react";
import type { Player, Settings, HandicapSlot, RoundingMethod } from "../types";

interface Props {
  players: Player[];
  settings: Settings;
}

function applyRounding(value: number, method: RoundingMethod): number {
  switch (method) {
    case "ceil":
      return Math.ceil(value);
    case "floor":
      return Math.floor(value);
    case "round":
    default:
      return Math.round(value);
  }
}

export default function HandicapCalcPage({ players, settings }: Props) {
  const [slotCount, setSlotCount] = useState(settings.defaultPlayerCount);
  const [slots, setSlots] = useState<HandicapSlot[]>(
    Array.from({ length: settings.maxPlayerCount }, () => ({
      playerId: null,
      playerName: "",
      gHandicap: 0,
      calculatedHandicap: 0,
    }))
  );
  const [calculated, setCalculated] = useState(false);

  const activeSlots = slots.slice(0, slotCount);

  // 선수 선택
  const handleSelectPlayer = (index: number, playerId: string) => {
    const newSlots = [...slots];
    if (!playerId) {
      newSlots[index] = {
        playerId: null,
        playerName: "",
        gHandicap: 0,
        calculatedHandicap: 0,
      };
    } else {
      const player = players.find((p) => p.id === parseInt(playerId));
      if (player) {
        newSlots[index] = {
          playerId: player.id,
          playerName: player.name,
          gHandicap: Number(player.gHandicap),
          calculatedHandicap: 0,
        };
      }
    }
    setSlots(newSlots);
    setCalculated(false);
  };

  // 핸디캡 계산
  const handleCalculate = () => {
    const filled = activeSlots.filter((s) => s.playerId !== null);
    if (filled.length < 2) {
      alert("최소 2명의 선수를 선택해주세요.");
      return;
    }

    // 가장 낮은 G핸디 (가장 잘 치는 사람) 기준
    const minHandicap = Math.min(...filled.map((s) => s.gHandicap));

    const newSlots = [...slots];
    for (let i = 0; i < slotCount; i++) {
      if (newSlots[i].playerId !== null) {
        const diff = newSlots[i].gHandicap - minHandicap;
        const raw = diff * settings.handicapRatio;
        newSlots[i].calculatedHandicap = applyRounding(
          raw,
          settings.roundingMethod
        );
      }
    }

    setSlots(newSlots);
    setCalculated(true);
  };

  // 사용 가능한 선수 (이미 선택된 선수 제외)
  const getAvailablePlayers = (currentIndex: number) => {
    const selectedIds = activeSlots
      .filter((s, i) => i !== currentIndex && s.playerId !== null)
      .map((s) => s.playerId);
    return players.filter((p) => !selectedIds.includes(p.id));
  };

  // 결과 테이블 데이터
  const resultData = useMemo(() => {
    if (!calculated) return [];
    return activeSlots
      .filter((s) => s.playerId !== null)
      .sort((a, b) => a.calculatedHandicap - b.calculatedHandicap);
  }, [calculated, activeSlots]);

  return (
    <div>
      <div className="card">
        <h2 className="card-title">🧮 핸디캡 계산</h2>

        {/* 인원 수 선택 */}
        <div className="form-group">
          <label>참가 인원 수</label>
          <div className="radio-group">
            {Array.from({ length: settings.maxPlayerCount - 1 }, (_, i) => i + 2).map(
              (n) => (
                <label key={n} className="radio-label">
                  <input
                    type="radio"
                    name="slotCount"
                    checked={slotCount === n}
                    onChange={() => {
                      setSlotCount(n);
                      setCalculated(false);
                    }}
                  />
                  <span>{n}명</span>
                </label>
              )
            )}
          </div>
        </div>

        {/* 선수 슬롯 */}
        <div className="slots-grid">
          {activeSlots.map((slot, index) => (
            <div key={index} className="player-slot">
              <div className="player-slot-number">{index + 1}</div>
              <select
                className="form-control"
                value={slot.playerId?.toString() || ""}
                onChange={(e) => handleSelectPlayer(index, e.target.value)}
              >
                <option value="">-- 선수 선택 --</option>
                {getAvailablePlayers(index).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (G핸디: {p.gHandicap})
                  </option>
                ))}
              </select>
              {slot.playerId && (
                <div className="handicap-info">
                  G핸디: <strong>{slot.gHandicap}</strong>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 계산 버튼 */}
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button className="btn btn-accent" onClick={handleCalculate} style={{ fontSize: "1.1rem", padding: "0.8rem 2.5rem" }}>
            🧮 핸디캡 계산
          </button>
        </div>
      </div>

      {/* 결과 */}
      {calculated && resultData.length > 0 && (
        <div className="card">
          <h2 className="card-title">📋 핸디캡 계산 결과</h2>
          <div
            style={{
              background: "#f5f5f5",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "#666",
            }}
          >
            적용 비율: <strong>{Math.round(settings.handicapRatio * 100)}%</strong> |
            반올림 방식:{" "}
            <strong>
              {settings.roundingMethod === "round"
                ? "반올림"
                : settings.roundingMethod === "ceil"
                ? "올림"
                : "버림"}
            </strong>{" "}
            | 기준: G핸디 최소값 ({Math.min(...resultData.map((r) => r.gHandicap))})
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>선수</th>
                  <th>G핸디</th>
                  <th>G핸디 차이</th>
                  <th>× 비율</th>
                  <th>핸디캡 (타)</th>
                </tr>
              </thead>
              <tbody>
                {resultData.map((slot) => {
                  const minH = Math.min(
                    ...resultData.map((r) => r.gHandicap)
                  );
                  const diff = slot.gHandicap - minH;
                  const raw = diff * settings.handicapRatio;
                  return (
                    <tr key={slot.playerId}>
                      <td>
                        <strong>{slot.playerName}</strong>
                      </td>
                      <td>{slot.gHandicap}</td>
                      <td>{diff}</td>
                      <td>
                        {diff} × {Math.round(settings.handicapRatio * 100)}% ={" "}
                        {raw.toFixed(1)}
                      </td>
                      <td>
                        <span
                          style={{
                            background:
                              slot.calculatedHandicap === 0
                                ? "#e8f5e9"
                                : "#fff3e0",
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: "1.1rem",
                          }}
                        >
                          {slot.calculatedHandicap}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {players.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">
              등록된 선수가 없습니다. 먼저 "선수 관리"에서 선수를 등록해주세요.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
