import { Router } from "express";
import { jazzCashController } from "../../controller/index.js";
import { isLoggedIn, isAdmin } from "../../utils/middleware.js";
import {
  validateCreateJazzcashMerchant,
  validateDeleteJazzcashMerchant,
  validateGetJazzcashMerchant,
  validateJazzcashCnicRequest,
  validateJazzcashRequest,
  validateUpdateJazzcashMerchant,
} from "../../validators/paymentGateway/jazzCash.js";
import { apiKeyAuth } from "../../middleware/auth.js";
import { limiter } from "utils/rate_limit.js";

export default function (router: Router) {
  router.post("/dummy-callback",jazzCashController.dummyCallback)
  router.post("/jzw-disburse/:merchantId",[apiKeyAuth],jazzCashController.initiateMWDisbursementClone)
  router.post("/jzwc-disburse/:merchantId",[apiKeyAuth],jazzCashController.initiateMWDisbursementClone)
  router.post("/jz-disburse-status/:merchantId",[apiKeyAuth],jazzCashController.disburseInquiryController);
  router.post("/sjz-disburse-status/:merchantId",jazzCashController.simpleDisburseInquiryController);
  router.post("/ssjz-disburse-status/:merchantId",jazzCashController.simpleSandboxDisburseInquiryController);
  router.post("/ssjzw-disburse/:merchantId",jazzCashController.initiateSandboxMWDisbursementClone)
  // Define routes using arrow functions
  router.post(
    "/jz-disburse/:merchantId",
    [apiKeyAuth],
    jazzCashController.initiateDisbursmentClone
  )

  router.post(
    "/ssjz-disburse/:merchantId",
    jazzCashController.initiateSandboxDisbursmentClone
  )

  router.post(
    "/jzc-disburse/:merchantId",
    [apiKeyAuth],
    jazzCashController.initiateDisbursmentClone
  );

  router.post(
    "/initiate-jz/:merchantId",
    validateJazzcashRequest,
    jazzCashController.initiateJazzCash
  );

  router.post(
    "/initiate-jzc/:merchantId",
    validateJazzcashCnicRequest,
    jazzCashController.initiateJazzCashCnic
  );

  router.post(
    "/initiate-jza/:merchantId",
    [apiKeyAuth, ...validateJazzcashRequest],
    jazzCashController.initiateJazzCashAsync
  );

  // Merchant Config
  router.get(
    "/merchant-config",
    [isLoggedIn, isAdmin],
    // validateGetJazzcashMerchant,
    jazzCashController.getJazzCashMerchant
  );
  router.post(
    "/merchant-config",
    [isLoggedIn, isAdmin],
    validateCreateJazzcashMerchant,
    jazzCashController.createJazzCashMerchant
  );
  router.put(
    "/merchant-config/:merchantId",
    [isLoggedIn, isAdmin],
    validateUpdateJazzcashMerchant,
    jazzCashController.updateJazzCashMerchant
  );
  router.delete(
    "/merchant-config/:merchantId",
    [isLoggedIn, isAdmin],
    validateDeleteJazzcashMerchant,
    jazzCashController.deleteJazzCashMerchant
  );
  router.get("/status-inquiry/:merchantId",
    jazzCashController.statusInquiry
  );
  router.get("/simple-status-inquiry/:merchantId",
    jazzCashController.simpleStatusInquiry
  );
  router.post("/status-inquiry/:merchantId",
    jazzCashController.jazzStatusInquiry
  );
  return router;
}

/**
 * @swagger
 * /payment/initiate-jz/{merchantId}:
 *   post:
 *     summary: Initiate a JazzCash payment
 *     tags:
 *       - JazzCash
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Merchant ID
 *     requestBody:
 *       description: Payment data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - phone
 *               - redirect_url
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               phone:
 *                 type: string
 *                 description: Customer phone number
 *               redirect_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after payment
 *               type:
 *                 type: string
 *                 enum: [WALLET, CARD]
 *                 description: Payment type
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 * /payment/merchant-config/:
 *   get:
 *     summary: Retrieve JazzCash merchant configurations
 *     tags:
 *       - JazzCash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: merchantId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Merchant ID to filter configurations
 *     responses:
 *       200:
 *         description: List of JazzCash merchant configurations
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create a new JazzCash merchant configuration
 *     tags:
 *       - JazzCash
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: JazzCash merchant configuration data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - merchantId
 *               - jazzMerchantId
 *               - password
 *               - integritySalt
 *               - returnUrl
 *             properties:
 *               merchantId:
 *                 type: integer
 *                 description: Merchant ID
 *               jazzMerchantId:
 *                 type: string
 *                 description: JazzCash Merchant ID
 *               password:
 *                 type: string
 *                 description: JazzCash Password
 *               integritySalt:
 *                 type: string
 *                 description: Integrity Salt
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return URL after payment
 *     responses:
 *       200:
 *         description: Merchant configuration created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 * /payment/merchant-config/{merchantId}:
 *   put:
 *     summary: Update a JazzCash merchant configuration
 *     tags:
 *       - JazzCash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     requestBody:
 *       description: Updated merchant configuration data
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jazzMerchantId:
 *                 type: string
 *                 description: JazzCash Merchant ID
 *               password:
 *                 type: string
 *                 description: JazzCash Password
 *               integritySalt:
 *                 type: string
 *                 description: Integrity Salt
 *               returnUrl:
 *                 type: string
 *                 format: uri
 *                 description: Return URL after payment
 *     responses:
 *       200:
 *         description: Merchant configuration updated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a JazzCash merchant configuration
 *     tags:
 *       - JazzCash
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant configuration deleted successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 * /payment/status-inquiry/{merchantId}:
 *   get:
 *     summary: Retrieve the status of a transaction for a specific merchant.
 *     description: This endpoint allows merchants to inquire about the status of a specific transaction using their merchant ID and transaction details.
 *     tags:
 *       - [JazzCash]
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
 *             type: object
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: The unique identifier of the transaction.
 *             required:
 *               - transactionId
 *     responses:
 *       200:
 *         description: Successfully retrieved the transaction status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the transaction.
 *                 details:
 *                   type: object
 *                   description: Additional details about the transaction.
 *       400:
 *         description: Bad Request. Merchant ID or transaction ID is missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message detailing the issue.
 *       500:
 *         description: Internal Server Error. An error occurred while processing the request.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: Error message detailing the issue.
 */

