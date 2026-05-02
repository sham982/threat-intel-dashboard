import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import scansRouter from "./scans";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";
import resourcesRouter from "./resources";
import activityLogsRouter from "./activity-logs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(scansRouter);
router.use(alertsRouter);
router.use(dashboardRouter);
router.use(resourcesRouter);
router.use(activityLogsRouter);

export default router;
