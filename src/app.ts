import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cron from "node-cron";
import dotenv from "dotenv";
import routes from './routes/index.js';
import cors from 'cors';
import crypto from "crypto"

dotenv.config();


// import indexRouter from './routes/index.js';
// import usersRouter from './routes/users.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './swagger.js';  // Import the Swagger configuration
import transactionReportsRouter from "./routes/transaction/report.js"
import userRouter from "./routes/user/index.js"
import authRouter from "./routes/authentication/index.js"
import createTransactionRouter from "./routes/transaction/create.js"
import completeTransactionRouter from "./routes/transaction/complete.js"
import { errorHandler } from "./utils/middleware.js";
import task from "./utils/queue_task.js"
import pendingDisburse from "./utils/pending_disburse_cron.js"
// import { encrypt_payload } from 'utils/enc_dec.js';
// import backup from 'utils/backup.js';
import ExcelJS from "exceljs"
import prisma from 'prisma/client.js';
import { JsonObject } from '@prisma/client/runtime/library';

var app = express();
cron.schedule("0 16 * * 1-5", task);
// cron.schedule("* * * * *", pendingDisburse);
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');
app.set("trust proxy", true);
// Allow only specific origins
app.use(cors({
  origin: [
    'https://sahulatpay.com',
    `https://merchant.sahulatpay.com`,
    'https://dev.sahulatpay.com',
    `https://devtectsadmin.sahulatpay.com`,
    'http://localhost:3005',
    'http://localhost:*',
    '*'
  ],
  credentials: true,
}));
// app.use(cors())
// await backup()

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/transaction_reports', transactionReportsRouter);
app.use('/transaction_create', createTransactionRouter);
app.use('/transaction_complete', completeTransactionRouter);
app.use('/user_api', userRouter);
app.use('/auth_api', authRouter);


// Import all routes from routes/index
routes(app);

// Redoc route
// app.get('/redoc', (req, res) => {
// res.sendFile('C://Users/musta/OneDrive/Desktop/spb/node_modules/redoc/bundles/redoc.standalone.js');
// });

// Serve Swagger docs as JSON (required by Redoc)
app.get('/swagger.json', (req, res) => {
  res.json(swaggerDocs);
});

// Serve Redoc UI
app.get('/redoc', (req, res) => {
  res.sendFile(path.join(import.meta.dirname, '../', "redoc.html"));
});


export const generateExcelReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const merchants = await prisma.merchant.findMany({
      include: {
        commissions: {
          select: {
            commissionMode: true,
            commissionRate: true,
            easypaisaRate: true,
          },
        },
      },
    });

    // Fetch Transactions in bulk to minimize queries
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: last30Days },
        // providerDetails: { path: ["name"], string_contains: "Easypaisa" }, // Easypaisa
        // OR: [
        //   { providerDetails: { path: ["name"], string_contains: "JazzCash" } }, // JazzCash
        // ],
        status: 'completed'
      },
      select: {
        merchant_id: true,
        original_amount: true,
        providerDetails: true,
        createdAt: true,
      },
    });

    // Fetch Disbursements in bulk to minimize queries
    const disbursements = await prisma.disbursement.findMany({
      where: {
        createdAt: { gte: last30Days },
        status: "completed",
      },
      select: {
        merchant_id: true,
        transactionAmount: true,
        createdAt: true,
      },
    });

    // Map transactions & disbursements to merchants
    const merchantData = merchants.map((merchant) => {
      const merchantTransactions = transactions.filter(
        (txn) => txn.merchant_id == merchant.merchant_id
      );

      const merchantDisbursements = disbursements.filter(
        (d) => d.merchant_id == merchant.merchant_id
      );

      // Group transactions by provider
      const collections = { Easypaisa: 0, JazzCash: 0 };
      console.log(merchantTransactions)
      merchantTransactions.forEach((txn) => {
        if (txn.providerDetails && ((txn.providerDetails as JsonObject)?.name as string)?.includes("Easypaisa")) {
          if (txn.original_amount !== null) {
            collections.Easypaisa += +txn.original_amount;
          }
        } else if (txn.providerDetails && ((txn.providerDetails as JsonObject)?.name as string)?.includes("JazzCash")) {
          if (txn.original_amount !== null) {
            collections.JazzCash += +txn.original_amount;
          }
        }
      });

      // Determine commission rate dynamically
      const { commissionMode, commissionRate, easypaisaRate } =
        merchant.commissions[0] || {};

      const commissions = {
        Easypaisa:
          commissionMode === "SINGLE"
            ? (collections.Easypaisa * +commissionRate) / 100
            : (collections.Easypaisa * +(easypaisaRate ?? 0)) / 100,
        JazzCash:
          commissionMode === "SINGLE"
            ? (collections.JazzCash * +commissionRate) / 100
            : (collections.JazzCash * +commissionRate) / 100,
      };

      return {
        name: merchant.full_name,
        collections,
        commissions,
        disbursementTotal: merchantDisbursements.reduce(
          (sum, d) => sum + +d.transactionAmount,
          0
        ),
      };
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Merchant Report");

    // Styles
    const headerStyle = {
      font: { bold: true, size: 12 },
      alignment: { horizontal: "center" as "center" },
      fill: { type: "pattern" as "pattern", pattern: "solid" as "solid", fgColor: { argb: "DDEBF7" } },
    };

    const subHeaderStyle = {
      font: { bold: true },
      alignment: { horizontal: "left" as "left" },
      fill: { type: "pattern" as "pattern", pattern: "solid" as "solid", fgColor: { argb: "BDD7EE" } },
    };

    const dataRowStyle = {
      fill: { type: "pattern" as "pattern", pattern: "solid" as "solid", fgColor: { argb: "E2EFDA" } },
    };

    // Add Headers
    const headerRow = sheet.getRow(1);
    headerRow.getCell(1).value = "Merchant Name";
    headerRow.getCell(2).value = "Type";
    headerRow.getCell(3).value = "Amount";
    headerRow.getCell(4).value = "Commission";
    headerRow.eachCell((cell) => (cell.style = headerStyle));

    let rowIndex = 2;

    merchantData.forEach((merchant) => {
      const { collections, commissions, disbursementTotal } = merchant;

      // Add Merchant Name
      const merchantRow = sheet.getRow(rowIndex);
      merchantRow.getCell(1).value = merchant.name;
      merchantRow.getCell(1).style = subHeaderStyle;
      rowIndex++;

      // Add Easypaisa Collection and Commission
      const easypaisaRow = sheet.getRow(rowIndex);
      easypaisaRow.getCell(2).value = "Easypaisa Collection";
      easypaisaRow.getCell(3).value = collections.Easypaisa;
      easypaisaRow.getCell(4).value = commissions.Easypaisa;
      easypaisaRow.eachCell((cell) => (cell.style = dataRowStyle));
      rowIndex++;

      // Add JazzCash Collection and Commission
      const jazzcashRow = sheet.getRow(rowIndex);
      jazzcashRow.getCell(2).value = "JazzCash Collection";
      jazzcashRow.getCell(3).value = collections.JazzCash;
      jazzcashRow.getCell(4).value = commissions.JazzCash;
      jazzcashRow.eachCell((cell) => (cell.style = dataRowStyle));
      rowIndex++;

      const disbursementRow = sheet.getRow(rowIndex);
      disbursementRow.getCell(2).value = "Disbursement Amount";
      disbursementRow.getCell(3).value = disbursementTotal;
      disbursementRow.eachCell((cell) => (cell.style = dataRowStyle));
      rowIndex++;

      // Add an empty row for spacing after each merchant
      rowIndex++;
    });

    // Adjust Column Widths
    sheet.columns = [
      { key: "merchantName", width: 25 },
      { key: "type", width: 25 },
      { key: "amount", width: 30 },
      { key: "commission", width: 30 },
    ];

    // Save the Excel File
    const filePath = path.join(import.meta.dirname, "merchant_report.xlsx");
    await workbook.xlsx.writeFile(filePath);

    // Send the Excel file as a response
    res.download(filePath, "merchant_report.xlsx", (err) => {
      if (err) {
        console.error(err);
        res.status(500).json({ error: "Error downloading file." });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};




app.post('/generate-excel', (req, res, next) => {
  generateExcelReport(req, res, next).catch(next);
});


app.use((req, res, next) => {
  res.status(404).json({
    message: 'Not Found - Invalid URL',
  });
});

app.use(errorHandler)
app.listen(process.env.PORT || 3001, () => {
  console.log(`Server is running on port ${process.env.PORT || 3001}`);
});


// Example usage

// const encryptedData = await callbackEncrypt(JSON.stringify({
//   "amount": "amount",
//   "msisdn": "phone",
//   "time": "date",
//   "order_id": "transaction_id",
//   "status": "success",
//   "type": "payin"
// }),5);
// console.log('Encrypted Data:', encryptedData);
// const encryptedData =  {
//   encrypted_data: '218xAxfhkR/w996FGSsZrFyNzm/0aexghT64o+GdI9YHesyFOXGsqpN/i6G4zvN/EuA0PG1wljn69C28NLyscBfPtnOzBcOwan0qex6cnVqyMUpuqyPddqLxxGBalqecxDujudMVtO3/95O1SuM1legXUq7ryGsksgw+mBOjnvXdBYX8P5w+tqY=',
//   iv: '6xzsQbcvS/MuESzS',
//   tag: '/q5sMh2MCR9LwdbUwH6vHw=='
// }
// const decryptedData = await callbackDecrypt(encryptedData.encrypted_data, encryptedData.iv, encryptedData.tag);
// console.log('Decrypted Data:', decryptedData);
// export default app;