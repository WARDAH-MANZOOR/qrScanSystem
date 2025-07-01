import { Router } from "express";
import backOfficeController from "controller/backoffice/backoffice.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";
import backOfficeValidator from "validators/backoffice/index.js";

const settlementRouter = Router();

settlementRouter.post('/settle-transactions', [isLoggedIn, isAdmin], backOfficeController.settleTransactions);
settlementRouter.post('/settle-all/:merchantId', [isLoggedIn, isAdmin], backOfficeController.settleAllMerchantTransactions);
settlementRouter.post("/usdt-settlement",[isLoggedIn, isAdmin, ...backOfficeValidator.validateSettlement], backOfficeValidator.handleValidationErrors, backOfficeController.createUSDTSettlement)
settlementRouter.post("/div-settlements",[isLoggedIn, isAdmin], backOfficeController.divideSettlementRecords)
settlementRouter.get("/process-today",[isLoggedIn, isAdmin], backOfficeController.processTodaySettlements)
settlementRouter.post('/settle-transactions/tele', backOfficeController.settleTransactionsForTelegram);
settlementRouter.post('/fail-transactions/tele', backOfficeController.failTransactionsForTelegram);
settlementRouter.post('/fail-disbursements/tele', backOfficeController.failDisbursementsForTelegram);

export default settlementRouter;
