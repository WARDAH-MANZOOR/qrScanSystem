import jazzCashController from './paymentGateway/jazzCash.js';
import easyPaisaController from './paymentGateway/easyPaisa.js';
import transactionController from './transactions/index.js';
import merchantController from './merchant/index.js';
import dashboardController from './dashboard/index.js';
import swichController from "./paymentGateway/swich.js"
import easyPaisaDisburse from './paymentGateway/easyPaisaDisburse.js';
import authenticationController from './authentication/index.js'

export {
    jazzCashController,
    transactionController,
    merchantController,
    dashboardController,
    easyPaisaController,
    swichController,
    easyPaisaDisburse,
    authenticationController

};