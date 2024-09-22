import { Router } from 'express';
import prisma from '../../prisma/client.js'; // Assuming Prisma client is set up
import { parseISO, subDays } from 'date-fns';
import { authorize, isLoggedIn } from '../../utils/middleware.js';
const router = Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         transaction_id:
 *           type: integer
 *           description: The unique ID of the transaction.
 *           example: 123
 *         date_time:
 *           type: string
 *           format: date-time
 *           description: Date and time of the transaction.
 *           example: 2023-09-01T12:30:00Z
 *         amount:
 *           type: number
 *           format: float
 *           description: Transaction amount.
 *           example: 199.99
 *         issuer:
 *           type: object
 *           properties:
 *             issuer_id:
 *               type: integer
 *               description: Unique ID of the issuer.
 *               example: 1
 *             issuer_name:
 *               type: string
 *               description: Name of the issuer.
 *               example: "Bank XYZ"
 *           description: Issuer associated with the transaction.
 *         status:
 *           type: string
 *           description: The status of the transaction.
 *           enum: [completed, pending, failed]
 *           example: completed
 *         type:
 *           type: string
 *           description: The type of transaction.
 *           enum: [purchase, refund, chargeback]
 *           example: purchase
 *         response_message:
 *           type: string
 *           description: Response message for the transaction.
 *           example: "Transaction completed successfully"
 *         settlement:
 *           type: boolean
 *           description: Whether the transaction has been settled.
 *           example: true
 *     Issuer:
 *       type: object
 *       properties:
 *         issuer_id:
 *           type: integer
 *           description: The unique ID of the issuer.
 *           example: 1
 *         issuer_name:
 *           type: string
 *           description: The name of the issuer.
 *           example: "Bank XYZ"
 */
/**
 * @swagger
 * /transaction_analytics/transactions:
 *   get:
 *     summary: Get the list of all transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get('/transactions', isLoggedIn, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany();
        res.status(200).json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/transactions/search:
 *   get:
 *     summary: Search for transactions with filters
 *     tags: [Transactions]
 *     parameters:
 *       - name: transaction_id
 *         in: query
 *         schema:
 *           type: integer
 *         description: Filter by transaction ID
 *       - name: amount
 *         in: query
 *         schema:
 *           type: number
 *         description: Filter by transaction amount
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by transaction status
 *       - name: issuer
 *         in: query
 *         schema:
 *           type: string
 *         description: Filter by transaction issuer
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get('/transactions/search', isLoggedIn, authorize('Transactions List'), async (req, res) => {
    const { transaction_id, amount, status, issuer } = req.query;
    if (status !== 'completed' && status !== 'pending' && status !== 'failed') {
        // send error response, log, return from function, etc.
        return;
    }
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                transaction_id: transaction_id ? Number(transaction_id) : undefined,
                amount: amount ? Number(amount) : undefined,
                status: status ? status : undefined,
                issuer_id: issuer ? Number(issuer) : undefined,
            },
        });
        res.status(200).json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/transactions/daywise:
 *   get:
 *     summary: Get the total transaction amount grouped by day
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Daywise transaction amount
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   day:
 *                     type: string
 *                     format: date
 *                   total_amount:
 *                     type: number
 */
router.get('/transactions/daywise', isLoggedIn, async (req, res) => {
    try {
        const transactions = await prisma.transaction.groupBy({
            by: ['date_time'],
            _sum: {
                amount: true,
            },
        });
        res.status(200).json(transactions);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/transactions/status_count:
 *   get:
 *     summary: Get the count of transactions grouped by status
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Count of transactions by status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/transactions/status_count', isLoggedIn, async (req, res) => {
    try {
        const statusCounts = await prisma.transaction.groupBy({
            by: ['status'],
            _count: {
                status: true,
            },
        });
        res.status(200).json(statusCounts);
    }
    catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/status/{transaction_id}:
 *   get:
 *     summary: Get a transaction by ID
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: transaction_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the transaction
 *     responses:
 *       200:
 *         description: A single transaction
 *       404:
 *         description: Transaction not found
 */
router.get('/status/:transaction_id', isLoggedIn, async (req, res) => {
    const { transaction_id } = req.params;
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { transaction_id: parseInt(transaction_id) },
        });
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        return res.status(200).json(transaction);
    }
    catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/datewise:
 *   get:
 *     summary: Get transactions filtered by date or period
 *     tags: [Transactions]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in YYYY-MM-DD format
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in YYYY-MM-DD format
 *       - in: query
 *         name: filter_type
 *         schema:
 *           type: string
 *         description: Predefined filter period (today, last_1_week, etc.)
 *     responses:
 *       200:
 *         description: A list of transactions with amounts
 */
router.get('/datewise', isLoggedIn, authorize('Transactions List'), async (req, res) => {
    const { start_date, end_date, filter_type } = req.query;
    let filter = {};
    const today = new Date();
    if (filter_type) {
        switch (filter_type) {
            case 'today':
                filter = { date_time: { gte: today } };
                break;
            case 'last_1_week':
                filter = { date_time: { gte: subDays(today, 7) } };
                break;
            case 'last_15_days':
                filter = { date_time: { gte: subDays(today, 15) } };
                break;
            case 'last_1_month':
                filter = { date_time: { gte: subDays(today, 30) } };
                break;
            case 'last_3_months':
                filter = { date_time: { gte: subDays(today, 90) } };
                break;
            case 'last_6_months':
                filter = { date_time: { gte: subDays(today, 180) } };
                break;
            case 'last_1_year':
                filter = { date_time: { gte: subDays(today, 365) } };
                break;
        }
    }
    else if (start_date && end_date) {
        filter = {
            date_time: {
                gte: parseISO(start_date),
                lte: parseISO(end_date),
            },
        };
    }
    try {
        const transactions = await prisma.transaction.findMany({
            where: filter,
        });
        const totalAmount = transactions.reduce((acc, curr) => acc + parseFloat(curr.amount.toString()), 0);
        res.json({
            transactions,
            total_amount: totalAmount,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
/**
 * @swagger
 * /transaction_analytics/transactions/current-month:
 *   get:
 *     summary: Get all transactions for the current month
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: List of transactions for the current month
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 */
router.get("/transactions/current-month", isLoggedIn, authorize("Transactions List"), async (req, res) => {
    const currentDate = new Date();
    const transactions = await prisma.transaction.findMany({
        where: {
            date_time: {
                gte: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
                lt: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
            },
        },
    });
    res.json(transactions);
});
/**
 * @swagger
 * /transaction_analytics/transactions/today-count:
 *   get:
 *     summary: Get the count of today's transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Total count of today's transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_count:
 *                   type: integer
 *                   example: 15
 */
router.get("/transactions/today-count", isLoggedIn, async (req, res) => {
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of the day as Date object
    const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999)); // End of the day as Date object
    const count = await prisma.transaction.count({
        where: {
            date_time: {
                gte: startOfDay, // Use Date object
                lt: endOfDay, // Use Date object
            },
        },
    });
    res.json({ total_count: count });
});
/**
 * @swagger
 * /transaction_analytics/transactions/last-30-days-count:
 *   get:
 *     summary: Get the count of transactions in the last 30 days
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Total count of transactions in the last 30 days
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_count:
 *                   type: integer
 *                   example: 120
 */
router.get("/transactions/last-30-days-count", isLoggedIn, async (req, res) => {
    const currentDate = new Date();
    const count = await prisma.transaction.count({
        where: {
            date_time: {
                gte: subDays(currentDate, 30),
            },
        },
    });
    res.json({ total_count: count });
});
/**
 * @swagger
 * /transaction_analytics/transactions/count:
 *   get:
 *     summary: Get the total count of transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Total count of all transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_count:
 *                   type: integer
 *                   example: 5000
 */
router.get("/transactions/count", isLoggedIn, async (req, res) => {
    const count = await prisma.transaction.count();
    res.json({ total_count: count });
});
/**
 * @swagger
 * /transaction_analytics/transactions/today-sum:
 *   get:
 *     summary: Get the sum of today's transactions
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Total sum of today's transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_amount:
 *                   type: number
 *                   example: 1000.00
 */
router.get("/transactions/today-sum", isLoggedIn, async (req, res) => {
    const currentDate = new Date();
    const startOfDay = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of the day as Date object
    const endOfDay = new Date(currentDate.setHours(23, 59, 59, 999)); // End of the day as Date object
    const totalAmount = await prisma.transaction.aggregate({
        _sum: {
            amount: true,
        },
        where: {
            date_time: {
                gte: startOfDay,
                lt: endOfDay,
            },
            status: 'completed',
        },
    });
    res.json({ total_amount: totalAmount._sum.amount || 0 });
});
/**
 * @swagger
 * /transaction_analytics/transactions/current-year-sum:
 *   get:
 *     summary: Get the sum of transactions for the current year
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: Total sum of transactions for the current year
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_amount:
 *                   type: number
 *                   example: 50000.00
 */
router.get("/transactions/current-year-sum", isLoggedIn, async (req, res) => {
    const currentDate = new Date();
    const totalAmount = await prisma.transaction.aggregate({
        _sum: {
            amount: true,
        },
        where: {
            date_time: {
                gte: new Date(currentDate.getFullYear(), 0, 1),
                lt: new Date(currentDate.getFullYear() + 1, 0, 1),
            },
        },
    });
    res.json({ total_amount: totalAmount._sum.amount || 0 });
});
export default router;
