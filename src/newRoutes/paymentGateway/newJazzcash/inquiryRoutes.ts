import { newJazzCashController } from "controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.post("/new-status-inquiry/:merchantId", newJazzCashController.newStatusInquiry)
}