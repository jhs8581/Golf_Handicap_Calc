import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Player } from "../entities/Player";
import { PlayerRecord } from "../entities/PlayerRecord";

const router = Router();

// 전체 선수 목록 조회
router.get("/", async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Player);
    const players = await repo.find({
      where: { isActive: true },
      order: { name: "ASC" },
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "선수 목록 조회 실패" });
  }
});

// 선수 상세 조회 (기록 포함)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Player);
    const player = await repo.findOne({
      where: { id: parseInt(req.params.id) },
      relations: ["records"],
    });
    if (!player) {
      return res.status(404).json({ error: "선수를 찾을 수 없습니다" });
    }
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: "선수 조회 실패" });
  }
});

// 선수 등록
router.post("/", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Player);
    const player = repo.create(req.body);
    const saved = await repo.save(player);
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: "선수 등록 실패" });
  }
});

// 선수 수정
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Player);
    const player = await repo.findOne({
      where: { id: parseInt(req.params.id) },
    });
    if (!player) {
      return res.status(404).json({ error: "선수를 찾을 수 없습니다" });
    }
    repo.merge(player, req.body);
    const updated = await repo.save(player);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "선수 수정 실패" });
  }
});

// 선수 삭제 (소프트 삭제)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Player);
    const player = await repo.findOne({
      where: { id: parseInt(req.params.id) },
    });
    if (!player) {
      return res.status(404).json({ error: "선수를 찾을 수 없습니다" });
    }
    player.isActive = false;
    await repo.save(player);
    res.json({ message: "선수 삭제 완료" });
  } catch (error) {
    res.status(500).json({ error: "선수 삭제 실패" });
  }
});

// 선수 기록 추가
router.post("/:id/records", async (req: Request, res: Response) => {
  try {
    const playerRepo = AppDataSource.getRepository(Player);
    const recordRepo = AppDataSource.getRepository(PlayerRecord);

    const player = await playerRepo.findOne({
      where: { id: parseInt(req.params.id) },
    });
    if (!player) {
      return res.status(404).json({ error: "선수를 찾을 수 없습니다" });
    }

    const record = recordRepo.create({
      ...req.body,
      playerId: player.id,
    });
    const saved = await recordRepo.save(record);

    // 최신 기록으로 선수 정보 업데이트
    player.gHandicap = req.body.gHandicap;
    player.avgScore = req.body.avgScore;
    await playerRepo.save(player);

    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: "기록 추가 실패" });
  }
});

// 선수 기록 목록 조회
router.get("/:id/records", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(PlayerRecord);
    const records = await repo.find({
      where: { playerId: parseInt(req.params.id) },
      order: { recordDate: "ASC" },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: "기록 조회 실패" });
  }
});

export default router;
