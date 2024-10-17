import { Router } from "express";
import { easyPaisaController } from "controller/index.js";

export default function (router: Router) {
  router.post("/initiate-ep/:merchantId", easyPaisaController.initiateEasyPaisa);
  return router;
}
