import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Game } from "../entities/Game";
import { GamePlayer } from "../entities/GamePlayer";
import { Player } from "../entities/Player";
import { PlayerRecord } from "../entities/PlayerRecord";

const router = Router();

// 경기 목록 조회
router.get("/", async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Game);
    const games = await repo.find({
      relations: ["gamePlayers", "gamePlayers.player"],
      order: { gameDate: "DESC" },
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: "경기 목록 조회 실패" });
  }
});

// 경기 상세 조회
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Game);
    const game = await repo.findOne({
      where: { id: parseInt(req.params.id as string) },
      relations: ["gamePlayers", "gamePlayers.player"],
    });
    if (!game) {
      return res.status(404).json({ error: "경기를 찾을 수 없습니다" });
    }
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: "경기 조회 실패" });
  }
});

// 경기 생성 + 결과 저장
router.post("/", async (req: Request, res: Response) => {
  try {
    const gameRepo = AppDataSource.getRepository(Game);
    const gpRepo = AppDataSource.getRepository(GamePlayer);
    const playerRepo = AppDataSource.getRepository(Player);
    const recordRepo = AppDataSource.getRepository(PlayerRecord);

    const { gameDate, courseName, handicapRatio, roundingMethod, memo, players } = req.body;

    // 경기 생성
    const game = gameRepo.create({
      gameDate,
      courseName,
      handicapRatio,
      roundingMethod,
      memo,
    });
    const savedGame = await gameRepo.save(game);

    // 참가 선수 저장 및 순위 계산
    const gamePlayers: GamePlayer[] = [];
    for (const p of players) {
      const gp = gpRepo.create({
        gameId: savedGame.id,
        playerId: p.playerId,
        gHandicap: p.gHandicap,
        calculatedHandicap: p.calculatedHandicap,
        grossScore: p.grossScore,
        netScore: p.netScore,
      });
      gamePlayers.push(await gpRepo.save(gp));
    }

    // 순위 계산 (넷스코어 기준, 낮을수록 상위)
    const sorted = [...gamePlayers]
      .filter((gp) => gp.netScore != null)
      .sort((a, b) => (a.netScore || 999) - (b.netScore || 999));

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1;
      await gpRepo.save(sorted[i]);
    }

    // 선수 기록에 반영
    for (const gp of gamePlayers) {
      if (gp.grossScore) {
        const player = await playerRepo.findOne({ where: { id: gp.playerId } });
        if (player) {
          const record = recordRepo.create({
            playerId: gp.playerId,
            recordDate: gameDate,
            gHandicap: gp.gHandicap,
            avgScore: gp.grossScore,
          });
          await recordRepo.save(record);

          // 선수 최신 정보 업데이트
          player.gHandicap = gp.gHandicap;
          player.avgScore = gp.grossScore;
          await playerRepo.save(player);
        }
      }
    }

    const result = await gameRepo.findOne({
      where: { id: savedGame.id },
      relations: ["gamePlayers", "gamePlayers.player"],
    });

    res.status(201).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "경기 저장 실패" });
  }
});

// 스코어 업데이트 (경기 등록 후 나중에 타수 입력)
router.put("/:id/scores", async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.id as string);
    const gpRepo = AppDataSource.getRepository(GamePlayer);
    const playerRepo = AppDataSource.getRepository(Player);
    const recordRepo = AppDataSource.getRepository(PlayerRecord);
    const gameRepo = AppDataSource.getRepository(Game);

    const game = await gameRepo.findOne({
      where: { id: gameId },
      relations: ["gamePlayers"],
    });
    if (!game) {
      return res.status(404).json({ error: "경기를 찾을 수 없습니다" });
    }

    const { players: playerScores } = req.body;

    // 기존 gamePlayers 업데이트
    for (const ps of playerScores) {
      const gp = game.gamePlayers.find(
        (g: GamePlayer) => g.playerId === ps.playerId
      );
      if (gp) {
        gp.grossScore = ps.grossScore;
        gp.netScore = ps.netScore;
        await gpRepo.save(gp);
      }
    }

    // 순위 계산
    const allGp = await gpRepo.find({ where: { gameId } });
    const sorted = allGp
      .filter((gp) => gp.netScore != null)
      .sort((a, b) => (a.netScore || 999) - (b.netScore || 999));

    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1;
      await gpRepo.save(sorted[i]);
    }

    // 선수 기록에 반영
    for (const gp of allGp) {
      if (gp.grossScore) {
        const player = await playerRepo.findOne({ where: { id: gp.playerId } });
        if (player) {
          const record = recordRepo.create({
            playerId: gp.playerId,
            recordDate: game.gameDate,
            gHandicap: gp.gHandicap,
            avgScore: gp.grossScore,
          });
          await recordRepo.save(record);

          player.gHandicap = gp.gHandicap;
          player.avgScore = gp.grossScore;
          await playerRepo.save(player);
        }
      }
    }

    const result = await gameRepo.findOne({
      where: { id: gameId },
      relations: ["gamePlayers", "gamePlayers.player"],
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "스코어 업데이트 실패" });
  }
});

// 경기 삭제
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(req.params.id as string);
    const gameRepo = AppDataSource.getRepository(Game);
    const gpRepo = AppDataSource.getRepository(GamePlayer);

    // 관련 gamePlayers 먼저 삭제
    await gpRepo.delete({ gameId });
    await gameRepo.delete(gameId);

    res.json({ message: "경기가 삭제되었습니다" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "경기 삭제 실패" });
  }
});

export default router;
