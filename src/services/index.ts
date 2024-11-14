import jazzCashService from './paymentGateway/jazzCash.js';
import transactionService from './transactions/index.js';
import merchantService from './merchant/index.js'
import dashboardService from './dashboard/index.js';
import easyPaisaService from './paymentGateway/easypaisa.js';
import swichService from "./paymentGateway/swich.js"
import easyPaisaDisburse from './paymentGateway/easyPaisaDisburse.js';
import authenticationService from './authentication/index.js';
import paymentRequestService from './paymentRequest/index.js';
import zindigiService from "./paymentGateway/zindigi.js"

export {
    jazzCashService,
    transactionService,
    merchantService,
    dashboardService,
    easyPaisaService,
    swichService,
    easyPaisaDisburse,
    authenticationService,
    paymentRequestService,
    zindigiService
};