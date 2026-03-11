import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Settings } from "../entities/Settings";

const router = Router();

// 설정 조회
router.get("/", async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Settings);
    let settings = await repo.findOne({ where: {} });
    if (!settings) {
      // 기본 설정 생성
      settings = repo.create({
        handicapRatio: 0.8,
        roundingMethod: "round",
        defaultPlayerCount: 4,
        maxPlayerCount: 8,
      });
      settings = await repo.save(settings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "설정 조회 실패" });
  }
});

// 설정 저장
router.put("/", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Settings);
    let settings = await repo.findOne({ where: {} });
    if (!settings) {
      settings = repo.create(req.body as Partial<Settings>);
    } else {
      repo.merge(settings, req.body as Partial<Settings>);
    }
    const saved = await repo.save(settings!);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: "설정 저장 실패" });
  }
});

export default router;
