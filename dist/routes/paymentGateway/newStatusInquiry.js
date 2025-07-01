import { newStatusInquiry } from "controller/index.js";
export default function (router) {
    router.get("/status-inquiry/v2/:merchantId", newStatusInquiry.statusInquiry);
}
