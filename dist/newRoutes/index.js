import payment from "./paymentGateway/index.js";
import merchant from "./merchant/index.js";
import dashboardMerchantRoutes from "./dashboard/merchantRoutes.js";
import dashboardAdminRoutes from "./dashboard/adminRoutes.js";
import transaction from "./transaction/index.js";
import disbursement from "./paymentGateway/disbursement.js";
import authenticationAuthRoutes from "./authentication/authRoutes.js"; // authentication
import authenticationApiKeyRoutes from "./authentication/apiKeyRoutes.js"; // authentication
import authenticationAdminRoutes from "./authentication/adminRoutes.js"; // authentication
import settlement from "./settlement/index.js";
import paymentRequest from "./paymentRequest/index.js";
import backofficeFinanceRoutes from "./backoffice/financeRoutes.js"; // backoffice
import backofficeCallbackRoutes from "./backoffice/callbackRoutes.js"; // backoffice
import backofficeMerchantRoutes from "./backoffice/merchantRoutes.js"; // backoffice
import backofficeSettlementRoutes from "./backoffice/settlementRoutes.js"; // backoffice
import backofficeTransactionRoutes from "./backoffice/transactionRoutes.js"; // backoffice
import user from "./user/crud.js";
import disbursementRequest from "./disbursementRequest/index.js";
import report from "./reports/excel.js";
import ipn from "./ipn/index.js";
import group from "./group/index.js";
import permissions from "./permissions/index.js";
import usdtSettlements from "./usdt-settlement/index.js";
import refund from "./refund/index.js";
export default function (app) {
    app.use("/payment", payment);
    app.use("/merchant", merchant);
    app.use("/dashboard", dashboardMerchantRoutes);
    app.use("/dashboard", dashboardAdminRoutes);
    app.use("/transactions", transaction);
    app.use("/disbursement", disbursement);
    app.use("/auth", authenticationAuthRoutes); // authentication
    app.use("/auth", authenticationApiKeyRoutes); // authentication
    app.use("/auth", authenticationAdminRoutes); // authentication
    app.use("/settlement", settlement);
    app.use("/payment-request", paymentRequest);
    app.use("/backoffice", backofficeFinanceRoutes); // backoffice
    app.use("/backoffice", backofficeCallbackRoutes); // backoffice
    app.use("/backoffice", backofficeMerchantRoutes); // backoffice
    app.use("/backoffice", backofficeSettlementRoutes); // backoffice
    app.use("/backoffice", backofficeTransactionRoutes); // backoffice
    app.use('/users', user);
    app.use('/disbursement-request', disbursementRequest);
    app.use('/report', report);
    app.use("/ipn", ipn);
    app.use("/group", group);
    app.use("/permissions", permissions);
    app.use("/usdt-settlement", usdtSettlements);
    app.use("/refund", refund);
}
