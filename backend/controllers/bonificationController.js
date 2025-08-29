import * as db from "../config/database.js";

// Get bonification configuration (selected programs)
export const getBonificationConfig = async (req, res) => {
  try {
    // Get current program for the user
    const currentProgram = await db.getOne(
      "SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE",
      [req.user.id]
    );

    if (!currentProgram) {
      return res.status(404).json({ message: "No current program found" });
    }

    // Get bonification configuration for the current program
    const config = await db.getOne(
      "SELECT selected_program_ids FROM bonification_config WHERE program_id = ?",
      [currentProgram.program_id]
    );
    if (!config || !config.selected_program_ids) {
      // If no config exists, default to current program only
      return res.json({
        selectedProgramIds: [currentProgram.program_id],
        isDefault: true
      });
    }

    // Check if selected_program_ids is a string and needs parsing
    let selectedProgramIds;
    if (typeof config.selected_program_ids === 'string') {
      try {
        selectedProgramIds = JSON.parse(config.selected_program_ids);
      } catch (parseError) {
        console.error("Error parsing selected_program_ids:", parseError);
        return res.status(500).json({ message: "Invalid bonification configuration" });
      }
    } else {
      // If it's already an array (or another type), use it directly
      selectedProgramIds = config.selected_program_ids;
    }

    // Validate that selectedProgramIds is an array
    if (!Array.isArray(selectedProgramIds)) {
      console.error("selected_program_ids is not an array:", selectedProgramIds);
      return res.status(500).json({ message: "Invalid bonification configuration" });
    }

    res.json({
      selectedProgramIds,
      isDefault: false
    });
  } catch (error) {
    console.error("Error getting bonification config:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update bonification configuration (Admin only)
export const updateBonificationConfig = async (req, res) => {
  try {
    const { selectedProgramIds } = req.body;

    if (!selectedProgramIds || !Array.isArray(selectedProgramIds)) {
      return res.status(400).json({ message: "selectedProgramIds must be an array" });
    }

    // Get current program for the user
    const currentProgram = await db.getOne(
      "SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE",
      [req.user.id]
    );

    if (!currentProgram) {
      return res.status(404).json({ message: "No current program found" });
    }

    // Validate that all selected program IDs exist and user has access
    const programPlaceholders = selectedProgramIds.map(() => "?").join(",");
    const validPrograms = await db.query(
      `SELECT DISTINCT p.id FROM programs p
       JOIN user_programs up ON p.id = up.program_id
       WHERE up.user_id = ? AND up.status = 'ACTIVE'
       AND p.id IN (${programPlaceholders})`,
      [req.user.id, ...selectedProgramIds]
    );

    if (validPrograms.length !== selectedProgramIds.length) {
      return res.status(400).json({ 
        message: "Some selected programs are invalid or you don't have access to them" 
      });
    }

    // Convert to JSON string for storage
    const selectedProgramIdsJson = JSON.stringify(selectedProgramIds);

    // Check if config already exists
    const existingConfig = await db.getOne(
      "SELECT id FROM bonification_config WHERE program_id = ?",
      [currentProgram.program_id]
    );

    if (existingConfig) {
      // Update existing config
      await db.update(
        "UPDATE bonification_config SET selected_program_ids = ?, updated_at = NOW(), updated_by = ? WHERE program_id = ?",
        [selectedProgramIdsJson, req.user.id, currentProgram.program_id]
      );
    } else {
      // Create new config
      await db.insert(
        "INSERT INTO bonification_config (program_id, selected_program_ids, created_by, updated_by) VALUES (?, ?, ?, ?)",
        [currentProgram.program_id, selectedProgramIdsJson, req.user.id, req.user.id]
      );
    }

    res.json({ 
      message: "Bonification configuration updated successfully",
      selectedProgramIds 
    });
  } catch (error) {
    console.error("Error updating bonification config:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to calculate bonification status
const calculateBonificationStatus = (
  totalHours,
  totalNetAmount,
  colporterName,
  colporterId
) => {
  // Bonification requirements
  const SILVER_HOURS = 280;
  const SILVER_AMOUNT = 3480;
  const GOLD_HOURS = 320;
  const GOLD_AMOUNT = 4800;

  // Calculate silver status
  const silverHoursProgress = Math.min(100, (totalHours / SILVER_HOURS) * 100);
  const silverAmountProgress = Math.min(
    100,
    (totalNetAmount / SILVER_AMOUNT) * 100
  );
  const silverAchieved =
    totalHours >= SILVER_HOURS && totalNetAmount >= SILVER_AMOUNT;

  // Calculate gold status
  const goldHoursProgress = Math.min(100, (totalHours / GOLD_HOURS) * 100);
  const goldAmountProgress = Math.min(
    100,
    (totalNetAmount / GOLD_AMOUNT) * 100
  );
  const goldAchieved =
    totalHours >= GOLD_HOURS && totalNetAmount >= GOLD_AMOUNT;

  // Determine next target
  let nextTarget = "SILVER";
  if (goldAchieved) {
    nextTarget = "COMPLETED";
  } else if (silverAchieved) {
    nextTarget = "GOLD";
  }

  return {
    colporterId: colporterId.toString(),
    colporterName,
    currentHours: totalHours,
    currentNetAmount: totalNetAmount,
    silverStatus: {
      achieved: silverAchieved,
      hoursProgress: silverHoursProgress,
      amountProgress: silverAmountProgress,
      hoursRemaining: Math.max(0, SILVER_HOURS - totalHours),
      amountRemaining: Math.max(0, SILVER_AMOUNT - totalNetAmount),
    },
    goldStatus: {
      achieved: goldAchieved,
      hoursProgress: goldHoursProgress,
      amountProgress: goldAmountProgress,
      hoursRemaining: Math.max(0, GOLD_HOURS - totalHours),
      amountRemaining: Math.max(0, GOLD_AMOUNT - totalNetAmount),
    },
    nextTarget,
  };
};

// Get bonification status for a specific user/person
export const getBonificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = "user" } = req.query;

    // Validate type parameter
    if (!["user", "person"].includes(type)) {
      return res.status(400).json({ message: "Invalid type parameter. Must be 'user' or 'person'" });
    }

    let personId = id;
    let colporterEmail = "";
    let colporterName = "";

    // If type is 'user', get the person_id from the user
    if (type === "user") {
      const user = await db.getOne("SELECT person_id FROM users WHERE id = ?", [id]);

      if (!user || !user.person_id) {
        return res.status(404).json({ message: "User not found or not associated with a person" });
      }

      personId = user.person_id;
    }

    // Get person details (including email)
    const person = await db.getOne(
      `SELECT id, email, CONCAT(first_name, ' ', last_name) as name, person_type 
       FROM people 
       WHERE id = ? AND person_type = 'COLPORTER'`,
      [personId]
    );

    if (!person) {
      console.warn(`Colporter not found for personId: ${personId}`);
      return res.status(404).json({ message: "Colporter not found" });
    }

    colporterEmail = person.email;
    colporterName = person.name;

    // Get current program for this user
    const currentProgram = await db.getOne(
      "SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE",
      [type === "user" ? id : req.user.id]
    );

    if (!currentProgram) {
      return res.status(404).json({ message: "No current program found" });
    }

    // Get bonification configuration (selected programs)
    const config = await db.getOne(
      "SELECT selected_program_ids FROM bonification_config WHERE program_id = ?",
      [currentProgram.program_id]
    );

    let selectedProgramIds = [];
    if (config && config.selected_program_ids) {
      // Check if selected_program_ids is a string and needs parsing
      if (typeof config.selected_program_ids === 'string') {
        try {
          selectedProgramIds = JSON.parse(config.selected_program_ids);
        } catch (parseError) {
          console.error("Error parsing selected_program_ids:", parseError);
          return res.status(500).json({ message: "Invalid bonification configuration" });
        }
      } else {
        selectedProgramIds = config.selected_program_ids;
      }

      // Validate that selectedProgramIds is an array of integers
      if (!Array.isArray(selectedProgramIds) || !selectedProgramIds.every(id => Number.isInteger(id))) {
        console.error("selected_program_ids is not a valid array of integers:", selectedProgramIds);
        return res.status(500).json({ message: "Invalid bonification configuration" });
      }
    } else {
      // Default to current program only if no config exists
      selectedProgramIds = [currentProgram.program_id];
    }

    if (selectedProgramIds.length === 0) {
      return res.status(400).json({
        message: "No programs specified for bonification calculation",
      });
    }

    // Get program names for selected programs
    const programPlaceholders = selectedProgramIds.map(() => "?").join(",");
    const programs = await db.query(
      `SELECT id, name 
       FROM programs 
       WHERE id IN (${programPlaceholders})`,
      [...selectedProgramIds]
    );

    // Create a map of program IDs to names
    const programNames = programs.reduce((map, program) => {
      map[program.id] = program.name;
      return map;
    }, {});

    // Get all person IDs for this colporter across selected programs using email
    const colporterIdsResult = await db.query(
      `SELECT id
       FROM people
       WHERE email = ? 
       AND person_type = 'COLPORTER'
       AND program_id IN (${programPlaceholders})
       AND status = 'ACTIVE'`,
      [colporterEmail, ...selectedProgramIds]
    );

    const colporterIds = colporterIdsResult.map(c => c.id);

    if (colporterIds.length === 0) {
      return res.status(404).json({ message: "No active colporter records found for this email across selected programs" });
    }

    // Get colporter percentage from the first program
    const programConfig = await db.getOne(
      "SELECT colporter_percentage FROM program_financial_config WHERE program_id = ?",
      [selectedProgramIds[0]]
    );

    const colporterPercentage = programConfig && programConfig.colporter_percentage
      ? parseFloat(programConfig.colporter_percentage)
      : process.env.DEFAULT_COLPORTER_PERCENTAGE
        ? parseFloat(process.env.DEFAULT_COLPORTER_PERCENTAGE)
        : 50; // Configurable default

    // Calculate total hours and net amount across selected programs for all colporter IDs
    const colporterIdsPlaceholders = colporterIds.map(() => "?").join(",");

    // Get total hours worked and total sales in a single query
    const transactionResult = await db.getOne(
      `SELECT COALESCE(SUM(t.hours_worked), 0) as total_hours,
              COALESCE(SUM(t.total), 0) as total_sales
       FROM transactions t
       WHERE t.student_id IN (${colporterIdsPlaceholders}) 
       AND t.status = 'APPROVED'
       AND t.program_id IN (${programPlaceholders})`,
      [...colporterIds, ...selectedProgramIds]
    );

    const totalHours = transactionResult.total_hours;
    const totalSales = transactionResult.total_sales;
    const totalNetAmount = totalSales * (colporterPercentage / 100);

    // Calculate bonification status
    const bonificationStatus = calculateBonificationStatus(
      totalHours,
      totalNetAmount,
      colporterName,
      personId // Keep original personId for consistency in response
    );

    // Add program names to the response
    res.json({
      ...bonificationStatus,
      programs: selectedProgramIds.map(id => ({
        programId: id,
        programName: programNames[id] || "Unknown Program"
      }))
    });
  } catch (error) {
    console.error("Error getting bonification status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
// Get all colporter bonifications
export const getAllColporterBonifications = async (req, res) => {
  try {
    // Get current program for the user
    const currentProgram = await db.getOne(
      "SELECT program_id FROM user_programs WHERE user_id = ? AND is_current = TRUE",
      [req.user.id]
    );

    if (!currentProgram) {
      return res.status(404).json({ message: "No current program found" });
    }

    // Get bonification configuration (selected programs)
    const config = await db.getOne(
      "SELECT selected_program_ids FROM bonification_config WHERE program_id = ?",
      [currentProgram.program_id]
    );

    let selectedProgramIds = [];
    if (config && config.selected_program_ids) {
      // Check if selected_program_ids is a string and needs parsing
      if (typeof config.selected_program_ids === 'string') {
        try {
          selectedProgramIds = JSON.parse(config.selected_program_ids);
        } catch (parseError) {
          console.error("Error parsing selected_program_ids:", parseError);
          return res.status(500).json({ message: "Invalid bonification configuration" });
        }
      } else {
        selectedProgramIds = config.selected_program_ids;
      }

      // Validate that selectedProgramIds is an array of numbers
      if (!Array.isArray(selectedProgramIds) || !selectedProgramIds.every(id => Number.isInteger(id))) {
        console.error("selected_program_ids is not a valid array of integers:", selectedProgramIds);
        return res.status(500).json({ message: "Invalid bonification configuration" });
      }
    } else {
      // Default to current program only if no config exists
      selectedProgramIds = [currentProgram.program_id];
    }

    if (selectedProgramIds.length === 0) {
      return res.status(400).json({
        message: "No programs specified for bonification calculation",
      });
    }

    // Get all colporters from the CURRENT program
    const currentProgramColporters = await db.query(
      `SELECT p.id, p.email, CONCAT(p.first_name, ' ', p.last_name) AS name
       FROM people p
       WHERE p.person_type = 'COLPORTER'
       AND p.program_id = ?
       AND p.status = 'ACTIVE'`,
      [currentProgram.program_id]
    );

    if (currentProgramColporters.length === 0) {
      return res.status(200).json([]); // Return empty array if no colporters found
    }

    // For each colporter in current program, get all their IDs across all selected programs
    const colporterDataMap = new Map();
    const programPlaceholders = selectedProgramIds.map(() => "?").join(",");

    for (const colporter of currentProgramColporters) {
      // Get all person IDs for this colporter across selected programs using email
      const allColporterIds = await db.query(
        `SELECT p.id, p.program_id
         FROM people p
         WHERE p.email = ?
         AND p.person_type = 'COLPORTER'
         AND p.program_id IN (${programPlaceholders})
         AND p.status = 'ACTIVE'`,
        [colporter.email, ...selectedProgramIds]
      );

      colporterDataMap.set(colporter.email, {
        name: colporter.name,
        currentProgramId: colporter.id,
        allIds: allColporterIds.map(c => c.id),
      });
    }

    // Get colporter percentage from the first program
    const programConfig = await db.getOne(
      "SELECT colporter_percentage FROM program_financial_config WHERE program_id = ?",
      [selectedProgramIds[0]]
    );

    const colporterPercentage = programConfig && programConfig.colporter_percentage
      ? parseFloat(programConfig.colporter_percentage)
      : 50; // Consider making this configurable or throwing an error

    // Calculate bonifications for each colporter
    const bonificationStatuses = [];

    for (const [email, colporterData] of colporterDataMap) {
      const colporterIdsPlaceholders = colporterData.allIds.map(() => "?").join(",");

      // Get total hours worked across all instances of this colporter in selected programs
      const hoursResult = await db.getOne(
        `SELECT COALESCE(SUM(COALESCE(t.hours_worked, 0)), 0) as total_hours
         FROM transactions t
         WHERE t.student_id IN (${colporterIdsPlaceholders})
         AND t.status = 'APPROVED'
         AND t.program_id IN (${programPlaceholders})`,
        [...colporterData.allIds, ...selectedProgramIds]
      );

      // Get total net amount across all instances of this colporter in selected programs
      const netAmountResult = await db.getOne(
        `SELECT COALESCE(SUM(t.total), 0) as total_sales
         FROM transactions t
         WHERE t.student_id IN (${colporterIdsPlaceholders})
         AND t.status = 'APPROVED'
         AND t.program_id IN (${programPlaceholders})`,
        [...colporterData.allIds, ...selectedProgramIds]
      );

      const totalHours = hoursResult.total_hours;
      const totalSales = netAmountResult.total_sales;
      const totalNetAmount = totalSales * (colporterPercentage / 100);

      // Calculate bonification status
      const bonificationStatus = calculateBonificationStatus(
        totalHours,
        totalNetAmount,
        colporterData.name,
        colporterData.currentProgramId
      );

      bonificationStatuses.push(bonificationStatus);
    }

    res.json(bonificationStatuses);
  } catch (error) {
    console.error("Error getting all colporter bonifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get available programs for bonifications
export const getAvailablePrograms = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let programs;

    if (userRole === "ADMIN") {
      // Admins can see all programs they have access to
      programs = await db.query(
        `SELECT DISTINCT p.* FROM programs p
         JOIN user_programs up ON p.id = up.program_id
         WHERE up.user_id = ? AND up.status = 'ACTIVE'
         ORDER BY p.is_active DESC, p.start_date DESC`,
        [userId]
      );
    } else {
      // SUPERVISOR users get programs they have access to
      programs = await db.query(
        `SELECT DISTINCT p.* FROM programs p
         JOIN user_programs up ON p.id = up.program_id
         WHERE up.user_id = ? AND up.status = 'ACTIVE'
         ORDER BY p.is_active DESC, p.start_date DESC`,
        [userId]
      );
    }

    res.json(programs);
  } catch (error) {
    console.error("Error getting available programs for bonifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export default {
  getBonificationStatus,
  getAllColporterBonifications,
  getAvailablePrograms,
  getBonificationConfig,
  updateBonificationConfig,
};
