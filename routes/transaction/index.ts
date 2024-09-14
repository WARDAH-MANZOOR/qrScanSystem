import { Router, Request, Response } from 'express';
import prisma from '../../prisma/client.js';  // Assuming Prisma client is set up
import { parse, subDays } from 'date-fns';
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
 * /transaction_api/transactions:
 *   get:
 *     summary: Get the list of all transactions
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
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany();
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /transaction_api/transactions/search:
 *   get:
 *     summary: Search for transactions with filters
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
router.get('/transactions/search', async (req: Request, res: Response) => {
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
        status: status ?status: undefined,
        issuer_id: issuer ? Number(issuer) : undefined,
      },
    });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /transaction_api/transactions/daywise:
 *   get:
 *     summary: Get the total transaction amount grouped by day
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
router.get('/transactions/daywise', async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.transaction.groupBy({
      by: ['date_time'],
      _sum: {
        amount: true,
      },
    });

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /transaction_api/transactions/status_count:
 *   get:
 *     summary: Get the count of transactions grouped by status
 *     responses:
 *       200:
 *         description: Count of transactions by status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/transactions/status_count', async (req: Request, res: Response) => {
  try {
    const statusCounts = await prisma.transaction.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    res.status(200).json(statusCounts);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * /transaction_api/status/{transaction_id}:
 *   get:
 *     summary: Get a transaction by ID
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
router.get('/status/:transaction_id', async (req: Request, res: Response) => {
    const { transaction_id } = req.params;
    try {
        const transaction = await prisma.transaction.findUnique({
            where: { transaction_id: parseInt(transaction_id) },
        });

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        return res.status(200).json(transaction);
    } catch (error) {
        return res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /transaction_api/datewise:
 *   get:
 *     summary: Get transactions filtered by date or period
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
router.get('/datewise', async (req: Request, res: Response) => {
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
  } else if (start_date && end_date) {
      filter = {
          date_time: {
              gte: parse(start_date as string,),
              lte: parse(end_date as string),
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
  } catch (error) {
      res.status(500).json({ error: 'Server error' });
  }
});
export default router;
