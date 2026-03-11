import { useState } from "react";
import type { Settings, RoundingMethod } from "../types";

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export default function SettingsPage({ settings, onSave }: Props) {
  const [form, setForm] = useState<Settings>({ ...settings });

  const handleSave = () => {
    onSave(form);
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">⚙️ 핸디캡 설정</h2>

        {/* 핸디캡 비율 */}
        <div className="form-group">
          <label>핸디캡 비율 (%)</label>
          <div className="radio-group">
            {[
              { value: 0.7, label: "70%" },
              { value: 0.75, label: "75%" },
              { value: 0.8, label: "80%" },
              { value: 0.85, label: "85%" },
              { value: 0.9, label: "90%" },
              { value: 1.0, label: "100%" },
            ].map((opt) => (
              <label key={opt.value} className="radio-label">
                <input
                  type="radio"
                  name="handicapRatio"
                  checked={form.handicapRatio === opt.value}
                  onChange={() =>
                    setForm({ ...form, handicapRatio: opt.value })
                  }
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", color: "#666" }}>
              또는 직접 입력 (%):
            </label>
            <input
              type="number"
              className="form-control"
              style={{ width: "120px", display: "inline-block", marginLeft: "0.5rem" }}
              min={0}
              max={100}
              value={Math.round(form.handicapRatio * 100)}
              onChange={(e) =>
                setForm({
                  ...form,
                  handicapRatio: parseInt(e.target.value || "0") / 100,
                })
              }
            />
          </div>
        </div>

        {/* 반올림 방식 */}
        <div className="form-group">
          <label>반올림 방식</label>
          <div className="radio-group">
            {[
              { value: "round" as RoundingMethod, label: "반올림", desc: "0.5 이상 올림" },
              { value: "ceil" as RoundingMethod, label: "올림", desc: "항상 올림" },
              { value: "floor" as RoundingMethod, label: "버림", desc: "항상 버림" },
            ].map((opt) => (
              <label key={opt.value} className="radio-label">
                <input
                  type="radio"
                  name="roundingMethod"
                  checked={form.roundingMethod === opt.value}
                  onChange={() =>
                    setForm({ ...form, roundingMethod: opt.value })
                  }
                />
                <span>
                  {opt.label}{" "}
                  <small style={{ color: "#999" }}>({opt.desc})</small>
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 기본 인원 수 */}
        <div className="form-row">
          <div className="form-group">
            <label>기본 참가 인원</label>
            <select
              className="form-control"
              value={form.defaultPlayerCount}
              onChange={(e) =>
                setForm({
                  ...form,
                  defaultPlayerCount: parseInt(e.target.value),
                })
              }
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}명
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 미리보기 */}
        <div
          style={{
            background: "#f1f8e9",
            padding: "1rem",
            borderRadius: "8px",
            marginTop: "1rem",
            marginBottom: "1rem",
          }}
        >
          <strong>📋 현재 설정 요약</strong>
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
            <li>
              핸디캡 비율: <strong>{Math.round(form.handicapRatio * 100)}%</strong>
            </li>
            <li>
              반올림 방식:{" "}
              <strong>
                {form.roundingMethod === "round"
                  ? "반올림"
                  : form.roundingMethod === "ceil"
                  ? "올림"
                  : "버림"}
              </strong>
            </li>
            <li>
              기본 인원: <strong>{form.defaultPlayerCount}명</strong>
            </li>
          </ul>
          <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#666" }}>
            <strong>계산 예시:</strong> G핸디 차이가 10일 때 →{" "}
            10 × {Math.round(form.handicapRatio * 100)}% ={" "}
            {(() => {
              const raw = 10 * form.handicapRatio;
              if (form.roundingMethod === "ceil") return Math.ceil(raw);
              if (form.roundingMethod === "floor") return Math.floor(raw);
              return Math.round(raw);
            })()}
            타
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          💾 설정 저장
        </button>
      </div>
    </div>
  );
}
