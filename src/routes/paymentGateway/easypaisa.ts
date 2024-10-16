import { Router } from "express";
import router from "./jazzCash.js"
import { easypaisa } from "controller/paymentGateway/easyPaisa.js";

router.post("/initiate-ep",easypaisa);

export default router;