import jazzCash from "./paymentGateway/jazzCash.js";
import merchant from "./merchant/index.js";
import express from "express";

export default function (app: express.Application) {
  app.use("/payment", jazzCash);
  app.use("/merchant", merchant);
}
