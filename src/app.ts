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
import adminTransactionRouter from "./routes/user/admin_only.js"
import { errorHandler } from "./utils/middleware.js";
import task from "./utils/queue_task.js"
import { decryptData } from 'utils/enc_dec.js';
// import { encrypt_payload } from 'utils/enc_dec.js';
// import backup from 'utils/backup.js';

var app = express();
cron.schedule("0 16 * * 1-5", task);
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');
app.set("trust proxy",true);
// Allow only specific origins
app.use(cors({
  origin: [
    'https://sahulatpay.com',
    'http://localhost:3005',
    'http://localhost:*',
  ],
  credentials: true,
}));

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

console.log(decryptData("814c86e695359028d4cab4ba322d4ba9789c5c0401f3fef41da98acd3519c553c837344861f4ef165c245d77447455e8b4c7e46556b5937c2a2951804ffbf9bf9b59fefc9b62b0e2f36b67f186f3e5dceedefbcb71bdc99bf9d943b4232a9aacbc3bf629c9af8b6a23f574bed93deb241bf7b4c84ff6d217c730bdeddfcc62feaab0eda0829049d67ee6c7652af431f0aaf83b251904302505c4f9e15c52036169e56f73b052e8f20cfa484ec68da08871b20684cb9080333d8e9ac0b9f2554d78b2f49af47de5e54d24aa499c5de912e693958e714ccd9b42881abe421c7c92cfb81e0da529f718d078a48a6d527b47d070a8c11057570230c5f9090dc022c958fd36e7dd7b10a4c9978e8f971c7731b40b50dce1c76761db1e7cf12c77bb06fbd898d3a55a165c11c7974b17e7e427bb07cce75f59517e222bcdd7e46e92b505b134feea69150534fc903b1b1bbbecd7eec0d7196e71a8a7616037ff0146dafad48ec3d3d69e186b00124d0fc9e8e4ee05da73439df75878c2299fc8f6a209d68583070f3e14bbfcfd8ad929f93858830ae7d223ab1acb7ead0ac0fdea4f8b6bae88739d4a27103b135cb5b8bbcf92ea50b88aac9823bfdc0212d787da4732","mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@"))
// Example usage

// const encryptedData = encryptWithPublicKey(publicKey, data);
// console.log('Encrypted Data:', encryptedData);
export default app;