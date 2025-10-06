import express from "express";

import * as bonusController from "../controllers/bonusController.js";
import { authenticateToken, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authenticateToken, bonusController.getAllBonuses);

router.get("/person/:personId", authenticateToken, bonusController.getBonusesByPerson);

router.post("/", authenticateToken, authorizeRoles(["ADMIN"]), bonusController.createBonus);

router.put("/:id", authenticateToken, authorizeRoles(["ADMIN"]), bonusController.updateBonus);

router.delete("/:id", authenticateToken, authorizeRoles(["ADMIN"]), bonusController.deleteBonus);

export default router;
