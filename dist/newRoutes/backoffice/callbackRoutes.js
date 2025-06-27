import { Router } from "express";
import backOfficeController from "controller/backoffice/backoffice.js";
const callbackRouter = Router();
callbackRouter.post("/payin-callback", backOfficeController.payinCallback);
callbackRouter.post("/payout-callback", backOfficeController.payoutCallback);
export default callbackRouter;
