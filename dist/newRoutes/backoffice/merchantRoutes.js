import { Router } from "express";
import backOfficeController from "controller/backoffice/backoffice.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";
const merchantRouter = Router();
merchantRouter.delete("/delete-merchant-data/:merchantId", [isLoggedIn, isAdmin], backOfficeController.deleteMerchantDataController);
export default merchantRouter;
