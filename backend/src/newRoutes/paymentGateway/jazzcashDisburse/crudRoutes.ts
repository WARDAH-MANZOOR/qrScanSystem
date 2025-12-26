import jazzcashDisburse from "../../../controller/paymentGateway/jazzcashDisburse.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "../../../utils/middleware.js";

export default function (router: Router) {
    router.post(
      "/jz-disburse-account",
      [isLoggedIn, isAdmin],
      jazzcashDisburse.addDisburseAccount
    );
    router.get(
      "/jz-disburse-account",
      [isLoggedIn, isAdmin],
      jazzcashDisburse.getDisburseAccount
    );
    router.put(
      "/jz-disburse-account/:accountId",
      [isLoggedIn, isAdmin],
      jazzcashDisburse.updateDisburseAccount
    );
    router.delete(
      "/jz-disburse-account/:accountId",
      [isLoggedIn, isAdmin],
      jazzcashDisburse.deleteDisburseAccount
    );
  }