import { Router } from "express";
import backOfficeController from "controller/backoffice/backoffice.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const transactionRouter = Router();

transactionRouter.get('/transaction-stats/:merchantId', [isLoggedIn, isAdmin], backOfficeController.checkMerchantTransactionStats);

transactionRouter.post("/dummy-transaction/:merchantId",[isLoggedIn, isAdmin], backOfficeController.createTransactionController)


export default transactionRouter;
