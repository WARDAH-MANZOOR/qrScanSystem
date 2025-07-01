import { statusInquiry } from "controller/index.js";
export default function (router) {
    router.get("/all-inquiry/:merchantId", statusInquiry.statusInquiryController);
}
