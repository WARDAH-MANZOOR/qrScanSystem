import { zindigiController } from "../../../controller/index.js";
export default function (router) {
    router.post("/initiate-zi", zindigiController.walletToWalletPaymentController);
    return router;
}
