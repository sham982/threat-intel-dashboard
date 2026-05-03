import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import registerRouter from "./register";
import usersRouter from "./users";
import scansRouter from "./scans";
import alertsRouter from "./alerts";
import dashboardRouter from "./dashboard";
import resourcesRouter from "./resources";
import activityLogsRouter from "./activity-logs";
import apiKeysRouter from "./api-keys";
import blocklistRouter from "./blocklist";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(registerRouter);
router.use(usersRouter);
router.use(scansRouter);
router.use(alertsRouter);
router.use(dashboardRouter);
router.use(resourcesRouter);
router.use(activityLogsRouter);
router.use(apiKeysRouter);
router.use(blocklistRouter);

export default router;
