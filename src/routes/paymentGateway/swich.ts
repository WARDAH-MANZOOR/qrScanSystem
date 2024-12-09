import { swichController } from "../../controller/index.js";
import { Router } from "express";
import { isAdmin, isLoggedIn } from "../../utils/middleware.js";
import { createSwichMerchantValidation, deleteSwichMerchantValidation, initiateSwichValidation, swichTxInquiryValidation, updateSwichMerchantValidation } from "../../validators/paymentGateway/swich.js";

export default function (router: Router) {
  router.post(
    "/initiate-sw/:merchantId",
    initiateSwichValidation,
    swichController.initiateSwichController
  );
  router.post(
    "/sw-merchant",
    [isLoggedIn, isAdmin, ...createSwichMerchantValidation],
    swichController.createSwichMerchant
  );
  router.get(
    "/sw-merchant",
    [isLoggedIn, isAdmin],
    swichController.getSwichMerchant
  );
  router.put(
    "/sw-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...updateSwichMerchantValidation],
    swichController.updateSwichMerchant
  );
  router.delete(
    "/sw-merchant/:merchantId",
    [isLoggedIn, isAdmin, ...deleteSwichMerchantValidation],
    swichController.deleteSwichMerchant
  );

  router.get(
    "/sw-inquiry/:merchantId",
    swichTxInquiryValidation,
    swichController.swichTxInquiry
  );
}

/**
 * @swagger
 * /payment/initiate-sw/{merchantId}:
 *   post:
 *     summary: Initiate a Swich transaction for a merchant
 *     tags: [Swich]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant ID
 *     requestBody:
 *       required: true 
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               channel:
 *                 type: string
 *                 description: Payment channel (e.g., JAZZCASH, etc.)
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               msisdn:
 *                 type: string
 *                 description: Customer's MSISDN
 *               email:
 *                 type: string
 *                 description: Customer's email
 *     responses:
 *       200:
 *         description: Transaction successfully initiated
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/sw-merchant:
 *   post:
 *     summary: Create a new Swich merchant
 *     tags: [Swich]
 *     parameters:
 *       - in: body
 *         name: merchant
 *         description: Merchant data
 *         schema:
 *           type: object
 *           properties:
 *             clientId:
 *               type: string
 *               description: Merchant's Client ID
 *             clientSecret:
 *               type: string
 *               description: Merchant's Client Secret
 *     responses:
 *       201:
 *         description: Merchant successfully created
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/sw-merchant:
 *   get:
 *     summary: Get all Swich merchants
 *     tags: [Swich]
 *     responses:
 *       200:
 *         description: List of merchants retrieved successfully
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/sw-merchant/{merchantId}:
 *   put:
 *     summary: Update a Swich merchant by merchant ID
 *     tags: [Swich]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant ID
 *       - in: body
 *         name: merchant
 *         description: Updated merchant data
 *         schema:
 *           type: object
 *           properties:
 *             clientId:
 *               type: string
 *               description: Updated Client ID
 *             clientSecret:
 *               type: string
 *               description: Updated Client Secret
 *     responses:
 *       200:
 *         description: Merchant updated successfully
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/sw-merchant/{merchantId}:
 *   delete:
 *     summary: Delete a Swich merchant by merchant ID
 *     tags: [Swich]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant ID
 *     responses:
 *       200:
 *         description: Merchant deleted successfully
 *       404:
 *         description: Merchant not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /payment/sw-inquiry/{merchantId}:
 *   get:
 *     summary: Inquire a Swich transaction
 *     tags: [Swich]
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         schema:
 *           type: string
 *         required: true
 *         description: Merchant ID
 *       - in: query
 *         name: transactionId
 *         schema:
 *           type: string
 *         required: true
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction inquiry successful
 *       400:
 *         description: Missing or invalid fields
 *       404:
 *         description: Transaction or merchant not found
 *       500:
 *         description: Server error
 */