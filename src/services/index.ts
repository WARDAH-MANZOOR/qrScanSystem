import jazzCashService from './paymentGateway/jazzCash.js';
import transactionService from './transactions/index.js';
import merchantService from './merchant/index.js'
import dashboardService from './dashboard/index.js';
import easyPaisaService from './paymentGateway/easypaisa.js';

export {
    jazzCashService,
    transactionService,
    merchantService,
    dashboardService,
    easyPaisaService
};