import { Router } from "express";
import { merchantController } from "controller/index.js";
import { isLoggedIn, isAdmin } from "utils/middleware.js";

const router = Router();

// Define routes using arrow functions
/**
 * @swagger
 * /merchant/:
 *   get:
 *     summary: Retrieve a list of merchants
 *     description: Fetches all merchants from the database.
 *     tags:
 *       - [AdminOnly]
 *     responses:
 *       200:
 *         description: A list of merchants
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Merchant'
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", [isLoggedIn, isAdmin], merchantController.getMerchants);

/**
 * @swagger
 * /merchant/:
 *    put:
 *      summary: Update merchant details
 *      tags: 
 *       - [AdminOnly] 
 *      security:
 *       - bearerAuth: []
 *      requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The full name of the merchant
 *                 example: John Doe
 *               phone_number:
 *                 type: string
 *                 description: The phone number of the merchant
 *                 example: +1234567890
 *               company_name:
 *                 type: string
 *                 description: The name of the company
 *                 example: Acme Inc
 *               company_url:
 *                 type: string
 *                 description: The website of the company
 *                 example: https://acme.com
 *               city:
 *                 type: string
 *                 description: The city where the company is based
 *                 example: New York
 *               payment_volume:
 *                 type: number
 *                 description: Monthly payment volume
 *                 example: 50000
 *               commission:
 *                 type: number
 *                 description: Monthly payment volume
 *                 example: 0.01
 *      responses:
 *       200:
 *         description: Merchant updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized - JWT token missing or invalid
 *       500:
 *         description: Internal server error 
 */
router.put("/", [isLoggedIn, isAdmin], merchantController.updateMerchant);

export default router;
