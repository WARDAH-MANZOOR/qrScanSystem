import card from "controller/card/index.js";
import express from "express";
const app = express.Router();
app.get("/:merchantId", card.getJazzCashCardMerchant);
app.post("/pay/:merchantId", card.payWithCard);
export default app;
