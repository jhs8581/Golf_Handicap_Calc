import { useState, useEffect } from "react";
import type { Player, PlayerRecord } from "../types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  players: Player[];
  onAdd: (player: Partial<Player>) => Promise<Player | undefined>;
  onUpdate: (id: number, data: Partial<Player>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  useLocalStorage: boolean;
}

const emptyForm = {
  name: "",
  age: "",
  department: "",
  gHandicap: "",
  avgScore: "",
};

export default function PlayersPage({
  players,
  onAdd,
  onUpdate,
  onDelete,
  useLocalStorage,
}: Props) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [records, setRecords] = useState<PlayerRecord[]>([]);
  const [recordForm, setRecordForm] = useState({
    recordDate: new Date().toISOString().split("T")[0],
    gHandicap: "",
    avgScore: "",
    memo: "",
  });

  // 선수 기록 로드
  useEffect(() => {
    if (selectedPlayer && !useLocalStorage) {
      fetch(`/api/players/${selectedPlayer}/records`)
        .then((r) => r.json())
        .then(setRecords)
        .catch(() => setRecords([]));
    } else if (selectedPlayer && useLocalStorage) {
      const key = `golf_records_${selectedPlayer}`;
      const saved = localStorage.getItem(key);
      setRecords(saved ? JSON.parse(saved) : []);
    }
  }, [selectedPlayer, useLocalStorage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const data = {
      name: form.name,
      age: form.age ? parseInt(form.age) : undefined,
      department: form.department || undefined,
      gHandicap: parseFloat(form.gHandicap || "0"),
      avgScore: parseFloat(form.avgScore || "0"),
    };

    if (editId) {
      await onUpdate(editId, data);
    } else {
      await onAdd(data);
    }

    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (player: Player) => {
    setForm({
      name: player.name,
      age: player.age?.toString() || "",
      department: player.department || "",
      gHandicap: player.gHandicap?.toString() || "",
      avgScore: player.avgScore?.toString() || "",
    });
    setEditId(player.id);
    setShowForm(true);
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    const data = {
      recordDate: recordForm.recordDate,
      gHandicap: parseFloat(recordForm.gHandicap || "0"),
      avgScore: parseFloat(recordForm.avgScore || "0"),
      memo: recordForm.memo,
    };

    if (useLocalStorage) {
      const key = `golf_records_${selectedPlayer}`;
      const newRecord: PlayerRecord = {
        id: Date.now(),
        playerId: selectedPlayer,
        ...data,
        createdAt: new Date().toISOString(),
      };
      const updated = [...records, newRecord];
      setRecords(updated);
      localStorage.setItem(key, JSON.stringify(updated));
    } else {
      try {
        await fetch(`/api/players/${selectedPlayer}/records`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const res = await fetch(`/api/players/${selectedPlayer}/records`);
        setRecords(await res.json());
      } catch {
        /* ignore */
      }
    }

    setRecordForm({
      recordDate: new Date().toISOString().split("T")[0],
      gHandicap: "",
      avgScore: "",
      memo: "",
    });
  };

  const chartData = records.map((r) => ({
    date: r.recordDate.split("T")[0],
    "G핸디": Number(r.gHandicap),
    평균타수: Number(r.avgScore),
  }));

  const selectedPlayerData = players.find((p) => p.id === selectedPlayer);

  return (
    <div>
      {/* 선수 목록 */}
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
            👤 선수 관리
          </h2>
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowForm(!showForm);
              setEditId(null);
              setForm(emptyForm);
            }}
          >
            {showForm ? "✕ 닫기" : "➕ 선수 등록"}
          </button>
        </div>

        {/* 등록/수정 폼 */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#f9fbe7",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>
              {editId ? "✏️ 선수 수정" : "➕ 새 선수 등록"}
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label>이름 *</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="홍길동"
                  required
                />
              </div>
              <div className="form-group">
                <label>나이</label>
                <input
                  className="form-control"
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="30"
                />
              </div>
              <div className="form-group">
                <label>부서</label>
                <input
                  className="form-control"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                  placeholder="영업부"
                />
              </div>
              <div className="form-group">
                <label>G핸디</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.1"
                  value={form.gHandicap}
                  onChange={(e) =>
                    setForm({ ...form, gHandicap: e.target.value })
                  }
                  placeholder="18"
                />
              </div>
              <div className="form-group">
                <label>평균타수</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.1"
                  value={form.avgScore}
                  onChange={(e) =>
                    setForm({ ...form, avgScore: e.target.value })
                  }
                  placeholder="90"
                />
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" type="submit">
                {editId ? "✏️ 수정" : "✅ 등록"}
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditId(null);
                  setForm(emptyForm);
                }}
              >
                취소
              </button>
            </div>
          </form>
        )}

        {/* 선수 테이블 */}
        {players.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <div className="empty-state-text">
              등록된 선수가 없습니다. 선수를 등록해주세요.
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>나이</th>
                  <th>부서</th>
                  <th>G핸디</th>
                  <th>평균타수</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr
                    key={p.id}
                    style={{
                      cursor: "pointer",
                      background:
                        selectedPlayer === p.id ? "#e8f5e9" : undefined,
                    }}
                    onClick={() =>
                      setSelectedPlayer(
                        selectedPlayer === p.id ? null : p.id
                      )
                    }
                  >
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td>{p.age || "-"}</td>
                    <td>{p.department || "-"}</td>
                    <td>{p.gHandicap}</td>
                    <td>{p.avgScore}</td>
                    <td>
                      <div className="btn-group" style={{ justifyContent: "center" }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(p);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`${p.name} 선수를 삭제하시겠습니까?`))
                              onDelete(p.id);
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 선수 기록 & 그래프 */}
      {selectedPlayer && selectedPlayerData && (
        <div className="card">
          <h2 className="card-title">
            📊 {selectedPlayerData.name} 선수 기록 추이
          </h2>

          {/* 기록 추가 */}
          <form
            onSubmit={handleAddRecord}
            style={{
              background: "#f5f5f5",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <h4 style={{ marginBottom: "0.5rem" }}>📝 기록 추가</h4>
            <div className="form-row">
              <div className="form-group">
                <label>날짜</label>
                <input
                  className="form-control"
                  type="date"
                  value={recordForm.recordDate}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, recordDate: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>G핸디</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.1"
                  value={recordForm.gHandicap}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, gHandicap: e.target.value })
                  }
                  placeholder={selectedPlayerData.gHandicap?.toString()}
                />
              </div>
              <div className="form-group">
                <label>평균타수</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.1"
                  value={recordForm.avgScore}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, avgScore: e.target.value })
                  }
                  placeholder={selectedPlayerData.avgScore?.toString()}
                />
              </div>
              <div className="form-group">
                <label>메모</label>
                <input
                  className="form-control"
                  value={recordForm.memo}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, memo: e.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" type="submit">
              ➕ 기록 추가
            </button>
          </form>

          {/* 그래프 */}
          {chartData.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="G핸디"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="평균타수"
                    stroke="#ff9800"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-text">
                아직 기록이 없습니다. 기록을 추가해주세요.
              </div>
            </div>
          )}

          {/* 기록 테이블 */}
          {records.length > 0 && (
            <div className="table-wrapper" style={{ marginTop: "1rem" }}>
              <table>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>G핸디</th>
                    <th>평균타수</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.recordDate?.split("T")[0]}</td>
                      <td>{r.gHandicap}</td>
                      <td>{r.avgScore}</td>
                      <td>{r.memo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
