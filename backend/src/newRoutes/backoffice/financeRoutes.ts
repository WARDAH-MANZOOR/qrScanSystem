import { Router } from "express";
import backOfficeController from "controller/backoffice/backoffice.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const financeRouter = Router();
financeRouter.post('/remove-finance/:merchantId', [isLoggedIn, isAdmin], backOfficeController.removeMerchantFinanceData);

financeRouter.post('/zero-wallet/:merchantId', [isLoggedIn, isAdmin], backOfficeController.zeroMerchantWalletBalance);

financeRouter.post('/adjust-wallet/:merchantId',  [isLoggedIn, isAdmin], backOfficeController.adjustMerchantWalletBalance);

financeRouter.post('/adjust-wallet-without/:merchantId',  [isLoggedIn, isAdmin], backOfficeController.adjustMerchantWalletBalanceWithoutSettlement);

export default financeRouter;
