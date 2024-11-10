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
 
console.log(decryptData("814c86e695359028d4cab4ba322d4ba9567c49d48ac080c903b67e0b1be2bc0641ae690d3bddce450e3f5b104436b87ca6dfeb399e9700df0953f72bc99ca22474f81316a820bb82f4c69cc44dd9002e6900d7a0e209768648663c13b8cbb3a16d23dbced6da29ba972366f96ee16fa161d7b70f648b183b8f92135506c31a7e9c5b85b81647b94f54125a1c3e62b0cd50b40b09ece4a627a723263a3ad34cbb9db2d738c448a3dafc3d2afe75a06552cc829f10592a8417d6552b3569756de39c289439a0ef223c5374035e9e530e694e6547d287ab4b38f0cd2b15065b86e0c305722076895491d58c819340c46fdf3855aea60fd43011c4c89eda1cd8bd9ceb74ff7611799175216b45bb459bfad29309b95628d60adc06ecfffe7d89d1d9839e49f4e95b0b9eee0c0c4ecc14fd119f3cd731fde9761703b5e1a5ab40fbfedbc846d16eb055ed6425ef101b078a666f00dd40980c3f5b2366d5d43991e34bde603f6d0125cd331cc59c862ea3c7021d60cf4b71e65acfd6adcb0a1f1ada97","mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@"))
// Example usage

// const encryptedData = encryptWithPublicKey(publicKey, data);
// console.log('Encrypted Data:', encryptedData);
export default app;