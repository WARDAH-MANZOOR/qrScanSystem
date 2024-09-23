import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import { Parser } from 'json2csv';
import pkg from 'pdf-creator-node';
const { create } = pkg;
import path from 'path';
import fs from "fs";
import { authorize, isLoggedIn } from '../../utils/middleware.js';
const prisma = new PrismaClient();
const router = Router();
/**
 * @swagger
 * /transaction-report:
 *   get:
 *     summary: Get a report of transactions, with optional filters and export formats.
 *     tags: [Transactions]
 *     parameters:
 *       - name: filter
 *         in: query
 *         description: Filter transactions by date range
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['all', '7days', '1month', '3months', '6months', '1year']
 *       - name: export
 *         in: query
 *         description: Export format for the report
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['csv', 'excel', 'pdf']
 *     responses:
 *       200:
 *         description: Returns a list of transactions with total amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total_amount:
 *                   type: number
 *                   description: Total sum of transaction amounts
 */
export const transactionReport = async (req, res) => {
    const filterOption = req.query.filter || 'all';
    const exportFormat = req.query.export || null;
    const transactions = await filterTransactions(filterOption);
    // Calculate total amount
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount.toNumber(), 0);
    // Handle export options
    if (exportFormat) {
        if (exportFormat === 'csv') {
            return exportCSV(res, transactions, totalAmount);
        }
        else if (exportFormat === 'excel') {
            return exportExcel(res, transactions, totalAmount);
        }
        else if (exportFormat === 'pdf') {
            return exportPDF(res, transactions, totalAmount);
        }
    }
    // Default JSON response
    return res.json({
        transactions,
        total_amount: totalAmount,
    });
};
// Filter transactions based on the given filter option
const filterTransactions = async (filterOption) => {
    const currentDate = new Date();
    let startDate = null;
    switch (filterOption) {
        case '7days':
            startDate = new Date();
            startDate.setDate(currentDate.getDate() - 7);
            break;
        case '1month':
            startDate = new Date();
            startDate.setMonth(currentDate.getMonth() - 1);
            break;
        case '3months':
            startDate = new Date();
            startDate.setMonth(currentDate.getMonth() - 3);
            break;
        case '6months':
            startDate = new Date();
            startDate.setMonth(currentDate.getMonth() - 6);
            break;
        case '1year':
            startDate = new Date();
            startDate.setFullYear(currentDate.getFullYear() - 1);
            break;
    }
    if (startDate) {
        return await prisma.transaction.findMany({
            where: {
                date_time: {
                    gte: startDate,
                    lt: currentDate,
                },
            },
        });
    }
    return await prisma.transaction.findMany();
};
// Export transactions to CSV
const exportCSV = (res, transactions, totalAmount) => {
    const fields = ['transaction_id', 'date_time', 'amount', 'status'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(transactions);
    res.header('Content-Type', 'text/csv');
    res.attachment('transaction_report.csv');
    res.send(`${csv}\nTotal Amount,,${totalAmount}`);
};
// Export transactions to Excel
const exportExcel = (res, transactions, totalAmount) => {
    const worksheet = xlsx.utils.json_to_sheet(transactions);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.attachment('transaction_report.xlsx');
    res.send(buffer);
};
// Export transactions to PDF
const exportPDF = async (res, transactions, totalAmount) => {
    const templatePath = path.join(import.meta.dirname, "../../", 'templates', 'transaction_report_template.html');
    let htmlTemplate = await fs.promises.readFile(templatePath, 'utf8');
    // Replace template placeholders with data (if you're not using a template engine)
    htmlTemplate = htmlTemplate
        .replace('{{totalAmount}}', totalAmount.toFixed(2))
        .replace('{{#each transactions}}', transactions.map(transaction => `
      <tr>
        <td>${transaction.transaction_id}</td>
        <td>${new Date(transaction.date_time).toLocaleString()}</td>
        <td>${transaction.amount.toFixed(2)}</td>
        <td>${transaction.status}</td>
      </tr>
    `).join(''))
        .replace('{{/each}}', '');
    // Options for PDF generation
    const pdfOptions = {
        format: 'A4',
        orientation: 'portrait',
        border: '10mm'
    };
    // Generate PDF
    const document = {
        html: htmlTemplate,
        data: {},
        type: 'buffer', // Use 'buffer' to send the PDF as a response
    };
    // Create PDF
    create(document, pdfOptions)
        .then((pdfBuffer) => {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="transaction_report.pdf"');
        res.send(pdfBuffer);
    })
        .catch((error) => {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    });
};
/**
 * @swagger
 * /transaction_reports/transaction-report:
 *   get:
 *     summary: Get a report of transactions, with optional filters and export formats.
 *     tags: [Transactions]
 *     parameters:
 *       - name: filter
 *         in: query
 *         description: Filter transactions by date range
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['all', '7days', '1month', '3months', '6months', '1year']
 *       - name: export
 *         in: query
 *         description: Export format for the report
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['csv', 'excel', 'pdf']
 *     responses:
 *       200:
 *         description: Returns a list of transactions with total amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 total_amount:
 *                   type: number
 *                   description: Total sum of transaction amounts
 */
router.get("/transaction-report", isLoggedIn, authorize('Reports'), transactionReport);
export default router;
