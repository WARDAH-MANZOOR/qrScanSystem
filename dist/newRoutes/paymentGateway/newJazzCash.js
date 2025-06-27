import { newJazzCashController } from "controller/index.js";
export default function (router) {
    router.post("/new-initiate-jz/:merchantId", newJazzCashController.newInitiateJazzCash);
    router.post("/new-initiate-jzc/:merchantId", newJazzCashController.newInitiateJazzCashCnic);
    router.post("/new-status-inquiry/:merchantId", newJazzCashController.newStatusInquiry);
}
