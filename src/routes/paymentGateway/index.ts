import { Router } from "express";
import jazzCashRouter from "./jazzCash.js";
import easypaisaRouter from "./easypaisa.js";

const router = Router();
 
jazzCashRouter(router);
easypaisaRouter(router);

export default router;