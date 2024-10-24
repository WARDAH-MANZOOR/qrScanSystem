import express, {Request, Response, NextFunction} from 'express';
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
import adminTransactionRouter from "./routes/user/admin_only.js"
import { errorHandler } from "./utils/middleware.js";
import task from "./utils/queue_task.js"
 
var app = express();
cron.schedule("0 0 * * 1-5",task); 
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');

// Allow only specific origins
app.use(cors({
  origin: [
    'https://sahulatpay.com',
    'http://localhost:3005',
    'http://localhost:*',
  ],
  credentials: true,
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/transaction_reports', transactionReportsRouter);
app.use('/transaction_create', createTransactionRouter);
app.use('/transaction_complete', completeTransactionRouter);
app.use('/admin_api', adminTransactionRouter);
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

function encryptWithPublicKey(publicKey: string, data: string) {
  // Convert data to Buffer
  const bufferData = Buffer.from(data, 'utf8');

  // Encrypt the data using the public key
  const encrypted = crypto.publicEncrypt(publicKey, bufferData);

  // Return the encrypted data in base64 format
  return encrypted.toString('base64');
}

// Example usage
const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA/qQW8FLl9v92lmcLE0ZC
E5Tu9OML8SOyDQJfcl8GTJm8AgcbrEmPeSOtatNljYze25U8NwlVLpvpHbfcJIUL
IWUYL5qQIHNsdLM2kLggbxhp1V6EC6mgC6fYJtKO7L+NgN6hnZdHZve3gBhzfltG
oM276SGDI615LUbSB+3YBz64YCg2pSxPcXTh50a5ovu8BJAWyeiwTkPPVb7T1dfS
tyH41SVk8E1XD+a9d3CVgsCqaCog9vIyOgiSrhKCUftWmtPeHNraNVFMOExkGh/c
JDdH+5zk2BkXsm3Tv/3+FTGhS5/5avdmcivv07jZ6LToP1uAzbzwLBRr3rnCoBiV
FwIDAQAB
-----END PUBLIC KEY-----`;
const data = '923424823244:18250';

const encryptedData = encryptWithPublicKey(publicKey, data);
console.log('Encrypted Data:', encryptedData);

export default app;
