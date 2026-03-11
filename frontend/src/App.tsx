import { useState, useEffect, useCallback } from "react";
import type { TabType, Settings, Player } from "./types";
import SettingsPage from "./pages/SettingsPage";
import PlayersPage from "./pages/PlayersPage";
import HandicapCalcPage from "./pages/HandicapCalcPage";
import GameResultsPage from "./pages/GameResultsPage";
import Toast from "./components/Toast";

// DB 미연결 시 로컬 스토리지 기반 fallback
const LOCAL_SETTINGS_KEY = "golf_settings";
const LOCAL_PLAYERS_KEY = "golf_players";
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const defaultSettings: Settings = {
  handicapRatio: 0.8,
  roundingMethod: "round",
  defaultPlayerCount: 4,
  maxPlayerCount: 8,
};

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("handicap");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [players, setPlayers] = useState<Player[]>([]);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    []
  );

  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [settingsRes, playersRes] = await Promise.all([
        fetch(`${API_BASE}/settings`),
        fetch(`${API_BASE}/players`),
      ]);

      if (settingsRes.ok && playersRes.ok) {
        const settingsData = await settingsRes.json();
        const playersData = await playersRes.json();
        setSettings(settingsData);
        setPlayers(playersData);
      } else {
        throw new Error("API 연결 실패");
      }
    } catch {
      // 로컬 스토리지 fallback
      console.log("⚠️ API 연결 실패 - 로컬 스토리지 모드");
      setUseLocalStorage(true);
      const savedSettings = localStorage.getItem(LOCAL_SETTINGS_KEY);
      const savedPlayers = localStorage.getItem(LOCAL_PLAYERS_KEY);
      if (savedSettings) setSettings(JSON.parse(savedSettings));
      if (savedPlayers) setPlayers(JSON.parse(savedPlayers));
    }
  };

  // 설정 저장
  const saveSettings = async (newSettings: Settings) => {
    try {
      if (useLocalStorage) {
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
        showToast("설정이 저장되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSettings),
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          showToast("설정이 저장되었습니다");
        }
      }
    } catch {
      showToast("설정 저장 실패", "error");
    }
  };

  // 선수 추가
  const addPlayer = async (player: Partial<Player>) => {
    try {
      if (useLocalStorage) {
        const newPlayer: Player = {
          id: Date.now(),
          name: player.name || "",
          age: player.age,
          department: player.department,
          gHandicap: player.gHandicap || 0,
          avgScore: player.avgScore || 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [...players, newPlayer];
        setPlayers(updated);
        localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(updated));
        showToast("선수가 등록되었습니다 (로컬)");
        return newPlayer;
      } else {
        const res = await fetch(`${API_BASE}/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(player),
        });
        if (res.ok) {
          const newPlayer = await res.json();
          setPlayers((prev) => [...prev, newPlayer]);
          showToast("선수가 등록되었습니다");
          return newPlayer;
        }
      }
    } catch {
      showToast("선수 등록 실패", "error");
    }
  };

  // 선수 수정
  const updatePlayer = async (id: number, data: Partial<Player>) => {
    try {
      if (useLocalStorage) {
        const updated = players.map((p) =>
          p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        );
        setPlayers(updated);
        localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(updated));
        showToast("선수 정보가 수정되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/players/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (res.ok) {
          const updatedPlayer = await res.json();
          setPlayers((prev) =>
            prev.map((p) => (p.id === id ? updatedPlayer : p))
          );
          showToast("선수 정보가 수정되었습니다");
        }
      }
    } catch {
      showToast("선수 수정 실패", "error");
    }
  };

  // 선수 삭제
  const deletePlayer = async (id: number) => {
    try {
      if (useLocalStorage) {
        const updated = players.filter((p) => p.id !== id);
        setPlayers(updated);
        localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(updated));
        showToast("선수가 삭제되었습니다 (로컬)");
      } else {
        const res = await fetch(`${API_BASE}/players/${id}`, { method: "DELETE" });
        if (res.ok) {
          setPlayers((prev) => prev.filter((p) => p.id !== id));
          showToast("선수가 삭제되었습니다");
        }
      }
    } catch {
      showToast("선수 삭제 실패", "error");
    }
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: "handicap", label: "핸디캡 계산", icon: "🧮" },
    { key: "results", label: "경기 결과", icon: "🏆" },
    { key: "players", label: "선수 관리", icon: "👤" },
    { key: "settings", label: "핸디캡 설정", icon: "⚙️" },
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>⛳ 골프 핸디캡 계산기</h1>
          <nav className="nav">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`nav-btn ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-content">
        {useLocalStorage && (
          <div
            style={{
              background: "#fff3e0",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "#e65100",
              border: "1px solid #ffcc02",
            }}
          >
            ⚠️ 서버에 연결할 수 없어 로컬 스토리지 모드로 동작합니다. 데이터는
            브라우저에 저장됩니다.
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsPage settings={settings} onSave={saveSettings} />
        )}
        {activeTab === "players" && (
          <PlayersPage
            players={players}
            onAdd={addPlayer}
            onUpdate={updatePlayer}
            onDelete={deletePlayer}
            useLocalStorage={useLocalStorage}
          />
        )}
        {activeTab === "handicap" && (
          <HandicapCalcPage
            players={players}
            settings={settings}
            useLocalStorage={useLocalStorage}
            showToast={showToast}
            onNavigateToResults={() => setActiveTab("results")}
          />
        )}
        {activeTab === "results" && (
          <GameResultsPage
            players={players}
            settings={settings}
            useLocalStorage={useLocalStorage}
            showToast={showToast}
          />
        )}
      </main>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

export default App;
