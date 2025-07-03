import { jazzCashController } from "../../../controller/index.js";
export default function (router) {
    router.post("/dummy-callback", jazzCashController.dummyCallback);
    router.get("/status-inquiry/:merchantId", jazzCashController.statusInquiry);
    router.get("/simple-status-inquiry/:merchantId", jazzCashController.simpleStatusInquiry);
    router.post("/status-inquiry/:merchantId", jazzCashController.jazzStatusInquiry);
    return router;
}
