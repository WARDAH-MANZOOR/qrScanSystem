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

console.log(decryptData("814c86e695359028d4cab4ba322d4ba97834c107b918d0f1b5925fa1fb2d990488e89867a0f778f4e36ed3c0970a14dfc02564d5991aa3401f339958c5fbd5657536a646e59d3ecf17feb11e706a0a3051822bced6b1669056e7bd297acdffcc848d9a275339667623461c978782ee53f0afdaf0b4302be81057910f498f2dc87adbaa45c073c1dc5f1e5726de69646fb23010097a840272ea42695250a10f2cd301c3d74bc95c4eb6e31d207685d8f8b9649ad7866476835243ce44007c9326a1faf23e6b5a9cf211a7769efef8615bb095c4763304612925556ee36e4609ed8794f51f4c7244bf47727922753eb4cac6775edef016d80d1829791641efe29585f1e3a04778b8668afe0b3b79e1efdfaa5e6c6384c27c93a6e739ca9b30e4c3f1764f5f2db497eb680137b6ebd94c5f1ae1b8ca29268edcf1763a218216a584b0dff72ad8997e874228d72e6b0d1e23f52d7bb81c5fa7fcaf7af58257127b6df4732d2bdd50ed807161eb003634e6670f6149c9e0ce2eee9eb351843fec2030","mYjC!nc3dibleY3k", "Myin!tv3ctorjCM@"))
// Example usage

// const encryptedData = encryptWithPublicKey(publicKey, data);
// console.log('Encrypted Data:', encryptedData);
export default app;