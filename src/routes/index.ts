import payment from "./paymentGateway/index.js";
import merchant from "./merchant/index.js";
import dashboard from "./dashboard/index.js";
import transaction from "./transaction/index.js";
import disbursement from "./paymentGateway/disbursement.js"
import auth from "./authentication/index.js";
import settlement from "./settlement/index.js";
import paymentRequest from "./paymentRequest/index.js";
import backoffice from "./backoffice/backoffice.js";
import user from "./user/crud.js";
import disbursementRequest from "./disbursementRequest/index.js";
import report from "./reports/excel.js";
import ipn from "./ipn/index.js";
import express from "express";
import group from "./group/index.js"
import permissions from "./permissions/index.js"
import usdtSettlements from "./usdt-settlement/index.js"
import refund from "./refund/index.js"
import disbursementDispute from "./disbursementDispute/index.js"

export default function (app: express.Application) {
  app.use("/payment", payment);
  app.use("/merchant", merchant);
  app.use("/dashboard", dashboard);
  app.use("/transactions", transaction);
  app.use("/disbursement", disbursement);
  app.use("/auth", auth);
  app.use("/settlement",settlement);
  app.use("/payment-request", paymentRequest);
  app.use("/backoffice",backoffice);
  app.use('/users',user);
  app.use('/disbursement-request',disbursementRequest);
  app.use('/report',report);
  app.use("/ipn",ipn);
  app.use("/group",group)
  app.use("/permissions",permissions)
  app.use("/usdt-settlement",usdtSettlements)
  app.use("/refund",refund)
  app.use("/disbursement-dispute",disbursementDispute)
}