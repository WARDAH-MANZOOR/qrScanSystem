import { newJazzCashController } from "controller/index.js";
export default function (router) {
    router.post("/new-status-inquiry/:merchantId", newJazzCashController.newStatusInquiry);
}
