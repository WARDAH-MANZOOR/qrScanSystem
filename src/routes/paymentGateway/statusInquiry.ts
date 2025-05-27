import { statusInquiry } from "controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.get("/all-inquiry/:merchantId", statusInquiry.statusInquiryController)
}