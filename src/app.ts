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
// import { encrypt_payload } from 'utils/enc_dec.js';
// import backup from 'utils/backup.js';

var app = express();
cron.schedule("0 11 * * 1-5", task);
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');
app.set("trust proxy",true);
// Allow only specific origins
// app.use(cors({
//   origin: [
//     'https://sahulatpay.com',
//     'http://localhost:3005',
//     'http://localhost:*',
//     '*'
//   ],
//   credentials: true,
// }));
app.use(cors())
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