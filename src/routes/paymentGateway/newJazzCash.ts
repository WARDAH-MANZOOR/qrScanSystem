import { newJazzCashController } from "controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.post("/new-initiate-jz/:merchantId", newJazzCashController.newInitiateJazzCash);
    router.post("/new-initiate-jzc/:merchantId", newJazzCashController.newInitiateJazzCashCnic)
    router.post("/new-status-inquiry/:merchantId", newJazzCashController.newStatusInquiry)
}