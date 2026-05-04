import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../lib/auth";
import { generateReportData, type ReportPeriod } from "../services/reportService";

const router: IRouter = Router();

// Get report data as JSON
router.get("/:period", requireAuth, requireRole("admin", "analyst"), async (req, res): Promise<void> => {
  try {
    const { period } = req.params;
    if (!["daily", "weekly", "monthly", "quarterly", "yearly"].includes(period)) {
      res.status(400).json({ error: "Invalid period. Use: daily, weekly, monthly, quarterly, yearly" });
      return;
    }
    
    const data = await generateReportData(period as ReportPeriod);
    res.json(data);
  } catch (error) {
    console.error("Report generation error:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

export default router;
