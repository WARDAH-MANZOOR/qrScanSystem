import payment from "./paymentGateway/index.js";    //paymentGateway(full except disbursement folder)
import merchantDisbursementRoutes from "./merchant/disbursementRoutes.js";    // merchant
import merchantCrudRoutes from "./merchant/crudRoutes.js";   // merchant
import dashboardMerchantRoutes from "./dashboard/merchantRoutes.js";    // dashboard
import dashboardAdminRoutes from "./dashboard/adminRoutes.js";    // dashboard
import transaction from "./transaction/crudRoutes.js";      // transaction
import disbursementRoutes from "./paymentGateway/disbursement/disbursementRoutes.js"     // paymentGateway/disbursement
import disbursementReportRoutes from "./paymentGateway/disbursement/reportRoutes.js"     // paymentGateway/disbursement
import disbursementWalletRoutes from "./paymentGateway/disbursement/walletRoutes.js"     // paymentGateway/disbursement
import authenticationAuthRoutes from "./authentication/authRoutes.js";        // authentication
import authenticationApiKeyRoutes from "./authentication/apiKeyRoutes.js";   // authentication
import authenticationAdminRoutes from "./authentication/adminRoutes.js";    // authentication
import settlement from "./settlement/crudRoutes.js";   // settlement
import paymentRequestCrudRoutes from "./paymentRequest/crudRoutes.js";        // paymentRequest
import paymentRequestTransactionRoutes from "./paymentRequest/transactionRoutes.js";        // paymentRequest
import backofficeFinanceRoutes from "./backoffice/financeRoutes.js";       // backoffice
import backofficeCallbackRoutes from "./backoffice/callbackRoutes.js";       // backoffice
import backofficeMerchantRoutes from "./backoffice/merchantRoutes.js";       // backoffice
import backofficeSettlementRoutes from "./backoffice/settlementRoutes.js";       // backoffice
import backofficeTransactionRoutes from "./backoffice/transactionRoutes.js";       // backoffice
import user from "./user/crud.js";      // user
import disbursementRequest from "./disbursementRequest/crudRoutes.js";    // disbursementRequest
import reportExportRoutes from "./reports/reportExportRoutes.js";        // report
import reportAnalysisRoutes from "./reports/reportAnalysisRoutes.js";      // report
import reportSettlementRoutes from "./reports/reportSettlementRoutes.js";     // report

import ipn from "./ipn/ipnRoutes.js";      // ipn 
import express from "express";
import group from "./group/crudRoutes.js"      // group
import permissions from "./permissions/crudRoutes.js"    // permissions
import usdtSettlements from "./usdt-settlement/crudRoutes.js"  // usdt Settlement
import refundTransactionRoutes from "./refund/refundTransactionRoutes.js"    // refund
import refundInquiryRoutes from "./refund/refundInquiryRoutes.js"     // refund


export default function (app: express.Application) {
  app.use("/payment", payment);
  app.use("/merchant", merchantDisbursementRoutes);      // merchant
  app.use("/merchant", merchantCrudRoutes);     // merchant
  app.use("/dashboard", dashboardMerchantRoutes);     // dashboard
  app.use("/dashboard", dashboardAdminRoutes);    // dashboard
  app.use("/transactions", transaction);    // transactions
  app.use("/disbursement", disbursementRoutes);     //paymentGateway/disbursement
  app.use("/disbursement", disbursementReportRoutes);    //paymentGateway/disbursement
  app.use("/disbursement", disbursementWalletRoutes);    //paymentGateway/disbursement
  app.use("/auth", authenticationAuthRoutes);          // authentication
  app.use("/auth", authenticationApiKeyRoutes);       // authentication
  app.use("/auth", authenticationAdminRoutes);       // authentication
  app.use("/settlement",settlement);    // settlement
  app.use("/payment-request", paymentRequestCrudRoutes);      // paymentRequest
  app.use("/payment-request", paymentRequestTransactionRoutes);      // paymentRequest
  app.use("/backoffice",backofficeFinanceRoutes);           // backoffice
  app.use("/backoffice",backofficeCallbackRoutes);         // backoffice
  app.use("/backoffice",backofficeMerchantRoutes);        // backoffice
  app.use("/backoffice",backofficeSettlementRoutes);    // backoffice
  app.use("/backoffice",backofficeTransactionRoutes);    // backoffice
  app.use('/users',user);  // user
  app.use('/disbursement-request',disbursementRequest);   //disbursement Request
  app.use('/report',reportExportRoutes);    // report
  app.use('/report',reportSettlementRoutes);     // report
  app.use('/report',reportAnalysisRoutes);     // report

  app.use("/ipn",ipn);     // ipn
  app.use("/group",group)  // group
  app.use("/permissions",permissions)    // permissions
  app.use("/usdt-settlement",usdtSettlements)  // usdtSettlements
  app.use("/refund",refundInquiryRoutes)     // refund
  app.use("/refund",refundTransactionRoutes)   // refund

}