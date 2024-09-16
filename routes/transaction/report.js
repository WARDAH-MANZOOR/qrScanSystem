import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import { Parser } from 'json2csv';
import { createPDF } from 'pdf-creator-node';
import path from 'path';
import fs from "fs";
const prisma = new PrismaClient();
/**
 * @swagger
 * /transaction-report:
 *   get:
 *     summary: Get a report of transactions, with optional filters and export formats.
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
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
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
    const templatePath = path.join(__dirname, 'templates', 'transaction_report_template.html');
    const htmlTemplate = await fs.promises.readFile(templatePath, 'utf8');
    const html = htmlTemplate
        .replace('{{transactions}}', JSON.stringify(transactions, null, 2))
        .replace('{{totalAmount}}', totalAmount.toString());
    const pdfBuffer = await createPDF({
        html,
        data: { transactions, totalAmount },
        path: './transaction_report.pdf',
    });
    res.header('Content-Type', 'application/pdf');
    res.attachment('transaction_report.pdf');
    res.send(pdfBuffer);
};
