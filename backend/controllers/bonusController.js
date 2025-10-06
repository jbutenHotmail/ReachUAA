import * as db from "../config/database.js";

export const getAllBonuses = async (req, res) => {
  try {
    const { programId } = req.query;

    let sql = `
      SELECT
        b.*,
        CONCAT(p.first_name, ' ', p.last_name) as person_name,
        prog.name as program_name,
        CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
      FROM bonuses b
      JOIN people p ON b.person_id = p.id
      JOIN programs prog ON b.program_id = prog.id
      JOIN users u ON b.created_by = u.id
      JOIN people u_creator ON u.person_id = u_creator.id
    `;

    const params = [];

    if (programId) {
      sql += " WHERE b.program_id = ?";
      params.push(programId);
    }

    sql += " ORDER BY b.bonus_date DESC, b.created_at DESC";

    const bonuses = await db.query(sql, params);
    res.json(bonuses);
  } catch (error) {
    console.error("Error getting bonuses:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getBonusesByPerson = async (req, res) => {
  try {
    const { personId } = req.params;
    const { programId } = req.query;

    let sql = `
      SELECT
        b.*,
        prog.name as program_name,
        CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
      FROM bonuses b
      JOIN programs prog ON b.program_id = prog.id
      JOIN users u ON b.created_by = u.id
      JOIN people u_creator ON u.person_id = u_creator.id
      WHERE b.person_id = ?
    `;

    const params = [personId];

    if (programId) {
      sql += " AND b.program_id = ?";
      params.push(programId);
    }

    sql += " ORDER BY b.bonus_date DESC, b.created_at DESC";

    const bonuses = await db.query(sql, params);
    res.json(bonuses);
  } catch (error) {
    console.error("Error getting bonuses by person:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createBonus = async (req, res) => {
  try {
    console.log('[createBonus] req.user:', req.user);
    console.log('[createBonus] req.body:', req.body);

    if (!req.user || !req.user.id) {
      console.error('[createBonus] User not authenticated');
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { program_id, person_id, amount, description, bonus_date, distributions } = req.body;
    const created_by = req.user.id;

    if (!program_id || !person_id || !amount || !bonus_date) {
      return res.status(400).json({
        message: "Missing required fields: program_id, person_id, amount, bonus_date",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "Bonus amount must be greater than 0",
      });
    }

    const person = await db.getOne("SELECT id, person_type FROM people WHERE id = ?", [person_id]);

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    const program = await db.getOne("SELECT id FROM programs WHERE id = ?", [program_id]);

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const sql = `
      INSERT INTO bonuses (program_id, person_id, amount, description, bonus_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const bonusId = await db.insert(sql, [
      program_id,
      person_id,
      amount,
      description || null,
      bonus_date,
      created_by,
    ]);

    // Insert distributions if provided
    if (distributions && Array.isArray(distributions) && distributions.length > 0) {
      for (const dist of distributions) {
        await db.insert(
          'INSERT INTO bonus_distributions (bonus_id, leader_id, amount, percentage) VALUES (?, ?, ?, ?)',
          [
            bonusId,
            dist.leader_id || null,
            dist.amount,
            dist.percentage
          ]
        );
      }
    }

    const newBonus = await db.getOne(
      `
      SELECT
        b.*,
        CONCAT(p.first_name, ' ', p.last_name) as person_name,
        prog.name as program_name,
        CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
      FROM bonuses b
      JOIN people p ON b.person_id = p.id
      JOIN programs prog ON b.program_id = prog.id
      JOIN users u ON b.created_by = u.id
      JOIN people u_creator ON u.person_id = u_creator.id
      WHERE b.id = ?
    `,
      [bonusId]
    );

    res.status(201).json(newBonus);
  } catch (error) {
    console.error("Error creating bonus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const updateBonus = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description, bonus_date } = req.body;

    const bonus = await db.getOne("SELECT id FROM bonuses WHERE id = ?", [id]);

    if (!bonus) {
      return res.status(404).json({ message: "Bonus not found" });
    }

    if (amount !== undefined && amount <= 0) {
      return res.status(400).json({
        message: "Bonus amount must be greater than 0",
      });
    }

    const updates = [];
    const params = [];

    if (amount !== undefined) {
      updates.push("amount = ?");
      params.push(amount);
    }

    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description || null);
    }

    if (bonus_date !== undefined) {
      updates.push("bonus_date = ?");
      params.push(bonus_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(id);

    const sql = `UPDATE bonuses SET ${updates.join(", ")} WHERE id = ?`;
    await db.update(sql, params);

    const updatedBonus = await db.getOne(
      `
      SELECT
        b.*,
        CONCAT(p.first_name, ' ', p.last_name) as person_name,
        prog.name as program_name,
        CONCAT(u_creator.first_name, ' ', u_creator.last_name) as created_by_name
      FROM bonuses b
      JOIN people p ON b.person_id = p.id
      JOIN programs prog ON b.program_id = prog.id
      JOIN users u ON b.created_by = u.id
      JOIN people u_creator ON u.person_id = u_creator.id
      WHERE b.id = ?
    `,
      [id]
    );

    res.json(updatedBonus);
  } catch (error) {
    console.error("Error updating bonus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const deleteBonus = async (req, res) => {
  try {
    const { id } = req.params;

    const bonus = await db.getOne("SELECT id FROM bonuses WHERE id = ?", [id]);

    if (!bonus) {
      return res.status(404).json({ message: "Bonus not found" });
    }

    await db.remove("DELETE FROM bonuses WHERE id = ?", [id]);

    res.json({ message: "Bonus deleted successfully" });
  } catch (error) {
    console.error("Error deleting bonus:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  getAllBonuses,
  getBonusesByPerson,
  createBonus,
  updateBonus,
  deleteBonus,
};
