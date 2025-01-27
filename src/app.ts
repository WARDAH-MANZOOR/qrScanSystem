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

var app = express();
cron.schedule("* * * * *", task);
// cron.schedule("* * * * *", pendingDisburse);
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');
app.set("trust proxy",true);
// Allow only specific origins
app.use(cors({
  origin: [
    'https://sahulatpay.com',
    `https://merchant.sahulatpay.com`,
    'https://assanpay.sahulatpay.com',
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

// export const generateExcelReport = async (req: Request, res: Response) => {
//   try {
//       const { merchants } = req.body; // Expecting `merchants` array in the POST request body

//       if (!merchants || !Array.isArray(merchants)) {
//           return res.status(400).json({ error: "Invalid or missing merchants data." });
//       }

//       const workbook = new ExcelJS.Workbook();
//       const sheet = workbook.addWorksheet('Merchant Report');

//       // Styles
//       const headerStyle = {
//           font: { bold: true, size: 12 },
//           alignment: { horizontal: 'center' as 'center' },
//           fill: { type: 'pattern' as 'pattern', pattern: 'solid' as ExcelJS.FillPatterns, fgColor: { argb: 'DDEBF7' } },
//       };

//       const subHeaderStyle = {
//           font: { bold: true },
//           alignment: { horizontal: 'left' as 'left' },
//           fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'BDD7EE' } },
//       };

//       const dataRowStyle = {
//           fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } },
//       };

//       // Add Headers
//       const headerRow = sheet.getRow(1);
//       headerRow.getCell(1).value = "Merchant Name";
//       headerRow.getCell(2).value = "Type";
//       headerRow.getCell(3).value = "Detail";
//       headerRow.getCell(4).value = "Saturday, January 20, 2024";
//       headerRow.getCell(5).value = "Tuesday, February 20, 2024";
//       headerRow.eachCell((cell) => (cell.style = headerStyle));

//       let rowIndex = 2;

//       merchants.forEach((merchant) => {
//           // Add Merchant Name
//           const merchantRow = sheet.getRow(rowIndex);
//           merchantRow.getCell(1).value = merchant.name;
//           merchantRow.getCell(1).style = subHeaderStyle;
//           rowIndex++;

//           const collectionTypes = ["Easypaisa", "JazzCash", "Sahulatpay", "Disbursement"];

//           collectionTypes.forEach((type) => {
//               const filteredData = merchant.data.filter((item) => item.type === type);

//               if (filteredData.length > 0) {
//                   const jan20 = filteredData.find((item) => item.date === "Saturday, January 20, 2024");
//                   const feb20 = filteredData.find((item) => item.date === "Tuesday, February 20, 2024");

//                   // Add Amount Row
//                   const amountRow = sheet.getRow(rowIndex);
//                   amountRow.getCell(2).value = `${type} Amount`;
//                   amountRow.getCell(4).value = jan20 ? jan20.amount : "-";
//                   amountRow.getCell(5).value = feb20 ? feb20.amount : "-";
//                   amountRow.eachCell((cell) => (cell.style = dataRowStyle));
//                   rowIndex++;

//                   // Add Commission Row
//                   const commissionRow = sheet.getRow(rowIndex);
//                   commissionRow.getCell(2).value = `${type} Commission`;
//                   commissionRow.getCell(4).value = jan20 ? (jan20.amount * jan20.mdr) / 100 : "-";
//                   commissionRow.getCell(5).value = feb20 ? (feb20.amount * feb20.mdr) / 100 : "-";
//                   commissionRow.eachCell((cell) => (cell.style = dataRowStyle));
//                   rowIndex++;

//                   // Add Account Name Row
//                   const accountRow = sheet.getRow(rowIndex);
//                   accountRow.getCell(2).value = `${type} Account Name`;
//                   accountRow.getCell(4).value = jan20 ? jan20.accountName : "-";
//                   accountRow.getCell(5).value = feb20 ? feb20.accountName : "-";
//                   accountRow.eachCell((cell) => (cell.style = dataRowStyle));
//                   rowIndex++;

//                   // Add empty row for spacing
//                   rowIndex++;
//               }
//           });

//           // Add an empty row for spacing after each merchant
//           rowIndex++;
//       });

//       // Adjust Column Widths
//       sheet.columns = [
//           { key: 'merchantName', width: 25 },
//           { key: 'type', width: 25 },
//           { key: 'detail', width: 30 },
//           { key: 'jan20', width: 30 },
//           { key: 'feb20', width: 30 },
//       ];

//       // Save the Excel File
//       const filePath = path.join(__dirname, 'merchant_report.xlsx');
//       await workbook.xlsx.writeFile(filePath);

//       // Send the Excel file as a response
//       res.download(filePath, 'merchant_report.xlsx', (err) => {
//           if (err) {
//               console.error(err);
//               res.status(500).json({ error: "Error downloading file." });
//           }
//       });
//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ error: "Internal server error." });
//   }
// };



// app.get('/generate-excel', generateExcelReport);


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