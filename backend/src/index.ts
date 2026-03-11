import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source";
import playerRoutes from "./routes/playerRoutes";
import settingsRoutes from "./routes/settingsRoutes";
import gameRoutes from "./routes/gameRoutes";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api/players", playerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/games", gameRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

AppDataSource.initialize()
  .then(() => {
    console.log("✅ 데이터베이스 연결 성공");
    app.listen(PORT, () => {
      console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch((error: unknown) => {
    console.error("❌ 데이터베이스 연결 실패:", error);
    // DB 없이도 서버 시작 (개발용)
    app.listen(PORT, () => {
      console.log(`🚀 서버 실행 중 (DB 미연결): http://localhost:${PORT}`);
    });
  });

export default app;
