import { payfastController } from "controller/index.js";
export default function (router) {
    router.post("/initiate-pf/:merchantId", payfastController.pay);
}
