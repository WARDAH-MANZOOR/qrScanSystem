import { Router } from "express";
import { isLoggedIn, isAdmin } from "../../utils/middleware.js";
import { easyPaisaController } from "../../controller/index.js";
import { apiKeyAuth } from "../../middleware/auth.js";
import {
  validateEasypaisaTxn,
  validateCreateMerchant,
  validateUpdateMerchant,
  validateInquiry,
} from "../../validators/paymentGateway/easypaisa.js";

export default function (router: Router) {
  router.post(
    "/ep-disburse/:merchantId",
    [apiKeyAuth],
    easyPaisaController.createDisbursement
  );

  router.post(
    "/epb-disburse/:merchantId",
    [apiKeyAuth],
    easyPaisaController.disburseThroughBank
  );

  router.get(
    "/ep-bal/:merchantId",
    [isLoggedIn, isAdmin],
    easyPaisaController.accountBalance
  );

  router.post(
    "/epd-inquiry/:merchantId",
    [apiKeyAuth],
    easyPaisaController.transactionInquiry
  );

  router.post(
    "/initiate-ep/:merchantId",
    validateEasypaisaTxn,
    easyPaisaController.initiateEasyPaisa
  );

  router.post(
    "/initiate-epa/:merchantId",
    [apiKeyAuth, ...validateEasypaisaTxn],
    easyPaisaController.initiateEasyPaisaAsync
  );

  router.post(
    "/ep-merchant",
    [isLoggedIn, isAdmin, ...validateCreateMerchant],
    easyPaisaController.createEasyPaisaMerchant
  );
  router.get(
    "/ep-merchant",
    [isLoggedIn, isAdmin],
    easyPaisaController.getEasyPaisaMerchant
  );
  router.put(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...validateUpdateMerchant],
    easyPaisaController.updateEasyPaisaMerchant
  );
  router.delete(
    "/ep-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...validateUpdateMerchant],
    easyPaisaController.deleteEasyPaisaMerchant
  );
  router.get(
    "/inquiry-ep/:merchantId",
    [...validateInquiry],
    easyPaisaController.statusInquiry
  );
  router.get("/ep-disburse",[isLoggedIn],easyPaisaController.getDisbursement)
  return router;
}

/**
 * @swagger
 * /payment/initiate-ep/{merchantId}/:
 *   post:
 *     summary: Initiate EasyPaisa transaction
 *     tags: [EasyPaisa]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful transaction initiation
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/ep-merchant/:
 *   post:
 *     summary: Create an EasyPaisa merchant
 *     tags: [EasyPaisa]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeId:
 *                 type: string
 *               username:
 *                 type: string
 *               credentials:
 *                 type: string
 *     responses:
 *       201:
 *         description: Merchant created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/ep-merchant/:
 *   get:
 *     summary: Get EasyPaisa merchant
 *     tags: [EasyPaisa]
 *     responses:
 *       200:
 *         description: Successfully retrieved merchant
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/ep-merchant/{merchantId}/:
 *   put:
 *     summary: Update an EasyPaisa merchant
 *     tags: [EasyPaisa]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/ep-merchant/{merchantId}/:
 *   delete:
 *     summary: Delete an EasyPaisa merchant
 *     tags: [EasyPaisa]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant deleted successfully
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/inquiry-ep/{merchantId}/:
 *   get:
 *     summary: Inquire status of an EasyPaisa transaction
 *     tags: [EasyPaisa]
 *     parameters:
 *       - name: merchantId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *       - name: orderId
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Order ID to inquire
 *     responses:
 *       200:
 *         description: Transaction inquiry result
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /payment/ep-disburse/{merchantId}:
 *   post:
 *     summary: Initiate a disbursement via EasyPaisa for a specific merchant.
 *     description: This endpoint allows merchants to initiate a disbursement through EasyPaisa by providing the necessary details.
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the merchant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisbursementPayload'
 *     responses:
 *       200:
 *         description: Disbursement initiated successfully.
 *       400:
 *         description: Bad Request. Invalid merchant ID or payload.
 *       500:
 *         description: Internal Server Error. An error occurred while processing the request.
 */

/**
 * @swagger
 * /payment/epb-disburse/{merchantId}:
 *   post:
 *     summary: Initiate a bank disbursement via EasyPaisa for a specific merchant.
 *     description: This endpoint allows merchants to initiate a bank disbursement through EasyPaisa by providing the necessary details.
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique identifier of the merchant.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DisbursementPayload'
 *     responses:
 *       200:
 *         description: Bank disbursement initiated successfully.
 *       400:
 *         description: Bad Request. Invalid merchant ID or payload.
 *       500:
 *         description: Internal Server Error. An error occurred while processing the request.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DisbursementPayload:
 *       type: object
 *       required:
 *         - amount
 *         - phone
 *       properties:
 *         amount:
 *           type: number
 *           description: The amount to be disbursed.
 *           example: 1000.00
 *         phone:
 *           type: string
 *           description: The recipient's phone number (must start with country code 92 for Pakistan).
 *           example: "923001234567"
 *         accountNo:
 *           type: string
 *           description: The bank account number for disbursement (for bank transfers).
 *           example: "1234567890"
 *         bankName:
 *           type: string
 *           description: The name of the bank (for bank disbursement only).
 *           example: "ABC Bank"
 *         purpose:
 *           type: string
 *           description: The purpose of the transaction.
 *           example: "0350"
 *         order_id:
 *           type: string
 *           description: Optional unique identifier for the transaction order.
 *           example: "ORD123456"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message detailing the issue.
 *           example: "Merchant ID is required."
 *         code:
 *           type: integer
 *           description: HTTP status code for the error.
 *           example: 400
 *         details:
 *           type: array
 *           items:
 *             type: string
 *           description: Additional details about the error (optional).
 *           example: ["Field 'phone' is required", "Amount must be greater than zero"]
 */
