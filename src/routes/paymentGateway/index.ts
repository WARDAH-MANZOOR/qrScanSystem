import { Router } from "express";
import jazzCashRouter from "./jazzCash.js";
import easypaisaRouter from "./easypaisa.js";
import swichRouter from "./swich.js"
import easyPaisaDisburse from "./easyPaisaDisburse.js";
import zindigiRouter from "./zindigi.js"
import jazzcashDisburse from "./jazzcashDisburse.js";
import newJazzCashRouter from "./newJazzCash.js"
import payFast from "./payFast.js";
import jazzCashCrud from "./jazzCashCrud.js";
const router = Router();
 
jazzCashRouter(router);
easypaisaRouter(router);
swichRouter(router);
easyPaisaDisburse(router);
zindigiRouter(router);
jazzcashDisburse(router);
newJazzCashRouter(router);
payFast(router);
jazzCashCrud(router);

export default router;