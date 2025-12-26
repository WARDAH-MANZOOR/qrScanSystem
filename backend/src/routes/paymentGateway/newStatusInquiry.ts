import { newStatusInquiry } from "controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.get("/status-inquiry/v2/:merchantId", newStatusInquiry.statusInquiry)
}