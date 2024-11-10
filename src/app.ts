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

console.log(decryptData("814c86e695359028d4cab4ba322d4ba948e7cff5f28774061565878afa6265ea7e606cfc1aae42549bce9b268083b7877f68ab3ffa8e043956a93d14859e3064e84bf71272f8d6a499901ea0eb602db74ceb8fcda436b14de03bf7f714fca8f95f734c9c7b85baa478b9df7914a75219b7db03e11b1ff3722b15afc61b4816b00a45582d1bfea6bfa075a22f7f4a1b9af6ce2c9ea478c9396aae3d818e872946e0613d86f96fe205fa1761e7695e5cfd1533b5dd29c10a94c6c18cc25c3e1be92f3b2f0030e34272b9dfcf1d08318cfadd73eae0f02a75f8a7b6bb4eb56e5d5be1895d45f2bde4f0001e9b4fe06c633a25844c1c1bda89082b46dee3174d5d9ca9ecf0a9caac3240da450bf83e8789aa55dd1f2fafe26fa5381644839540053c7e1564fd7ea67b5336a859fb93acd54904463af87817e487ca20ea57e9592e9141189f791d7d8a474b006ed898e0cdcbb070e72a7fefda9dbdbded38fb49f977504ee4e24a2e98972c3407b7b9bbdbf7d35aba15d0b4a360005395fa5beb4bd4d52d8dbe4f0f82fe1bdd68667d92ac18","mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@"))
// Example usage

// const encryptedData = encryptWithPublicKey(publicKey, data);
// console.log('Encrypted Data:', encryptedData);
export default app;