import { Router } from "express";
import jazzCashRouter from "./jazzCash.js";
import easypaisaRouter from "./easypaisa.js";
import swichRouter from "./swich.js"

const router = Router();
 
jazzCashRouter(router);
easypaisaRouter(router);
swichRouter(router);

export default router;