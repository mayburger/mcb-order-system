import { Router, type IRouter } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import restaurantRouter from "./restaurant";
import ordersRouter from "./orders";
import authRouter from "./auth";
import adminRouter from "./admin";
import kitchenRouter from "./kitchen";

const router: IRouter = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(restaurantRouter);
router.use(ordersRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(kitchenRouter);

export default router;
