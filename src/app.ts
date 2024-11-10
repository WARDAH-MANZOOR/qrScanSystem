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

console.log(decryptData("814c86e695359028d4cab4ba322d4ba948e7cff5f28774061565878afa6265ea7e606cfc1aae42549bce9b268083b7877f68ab3ffa8e043956a93d14859e3064e84bf71272f8d6a499901ea0eb602db74ceb8fcda436b14de03bf7f714fca8f95f734c9c7b85baa478b9df7914a75219b7db03e11b1ff3722b15afc61b4816b00a45582d1bfea6bfa075a22f7f4a1b9af6ce2c9ea478c9396aae3d818e872946e0613d86f96fe205fa1761e7695e5cfdc28838aa73f51c96280ecc0487eae6ff2f23564b4dad9e463339206995e84baae5998e9b9eeb73e6fe63aea5530b93bca4b71437b62a0930deb7fe226905bd625a601664dbf352cada8cfe8b6f2eb0529baa27754a94cf77ea2f98f0eee249dbc28c88cd1feae78d4eb18f15d0a1e1497df8e3e838b1def8e049e0d6adba8867d09a1172afb07e0ad8f8ca35be611f3f0cb5f4267fa557e6299c8555ae64581be319ac310f0102690faabdc7b5a615ebd2b7a6f7ea61dd61ddbd44bd4dc332f3f99097fa887f3043a46ec5ec809bef1a","mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@"))
// Example usage

// const encryptedData = encryptWithPublicKey(publicKey, data);
// console.log('Encrypted Data:', encryptedData);
export default app;