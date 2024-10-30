import { Router } from "express";
import { isLoggedIn, isAdmin } from "utils/middleware.js";
import { easyPaisaController } from "controller/index.js";
import {
  validateEasypaisaTxn,
  validateCreateMerchant,
  validateUpdateMerchant,
  validateInquiry,
} from "validators/paymentGateway/easypaisa.js";

export default function (router: Router) {
  router.post(
    "/ep-disburse/:merchantId",
    [isLoggedIn],
    easyPaisaController.createDisbursement
  );

  router.get(
    "/ep-disburse/",
    [isLoggedIn],
    easyPaisaController.getDisbursement
  )

  router.post(
    "/epb-disburse/:merchantId",
    [isLoggedIn],
    easyPaisaController.disburseThroughBank
  )

  router.post(
    "/initiate-ep/:merchantId",
    validateEasypaisaTxn,
    easyPaisaController.initiateEasyPaisa
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
