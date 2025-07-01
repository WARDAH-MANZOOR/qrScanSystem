import { zindigiController } from "../../../controller/index.js";
import { Router } from "express";

export default function (router: Router) {
    router.post("/initiate-zi", zindigiController.walletToWalletPaymentController)
    
    return router;
}