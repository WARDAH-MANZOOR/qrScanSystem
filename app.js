import createError from "http-errors";
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import cron from "node-cron";
import indexRouter from './routes/index.js';
import usersRouter from './routes/users.js';
import swaggerUi from 'swagger-ui-express';
import swaggerDocs from './swagger.js'; // Import the Swagger configuration
import transactionAnalyticsRouter from "./routes/transaction/analytics.js";
import transactionReportsRouter from "./routes/transaction/report.js";
import userRouter from "./routes/user/index.js";
import authRouter from "./routes/authentication/index.js";
import { errorHandler } from "./utils/middleware.js";
import task from "./utils/task_queue.js";
var app = express();
cron.schedule("* * * * *", task);
// view engine setup
app.set('views', "./views");
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static("./public"));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/transaction_analytics', transactionAnalyticsRouter);
app.use('/transaction_reports', transactionReportsRouter);
app.use('/user_api', userRouter);
app.use('/auth_api', authRouter);
app.use(errorHandler);
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
    res.sendFile(path.join(import.meta.dirname, "redoc.html"));
});
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});
// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
export default app;
