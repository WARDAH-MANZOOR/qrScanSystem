import { payfastController } from "controller/index.js";
import { Router } from "express";

export default function(router: Router) {
    router.post("/initiate-pf/:merchantId", payfastController.pay);
}