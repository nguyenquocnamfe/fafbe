require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require("cors");

var authRoute = require('./src/modules/auth/auth.route');
const userRoute = require('./src/modules/users/user.route');
var jobRoute = require('./src/modules/jobs/job.route');
var categoryRoute = require('./src/modules/category/cate.route');
var skillRoute = require('./src/modules/skills/skill.route');
var userSkillRoute = require('./src/modules/userSkills/userSkill.route');
var jobSkillRoute = require('./src/modules/jobSkills/jobSkill.route');
const proposalRoute = require('./src/modules/proposals/proposal.route');

var app = express();

// view engine setup removed

// 🚨 CORS PHẢI ĐẶT TRƯỚC ROUTES
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// 🚨 BẮT OPTIONS CHUNG
app.options("*", cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// static files middleware removed

// ✅ ROUTES
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/jobs', jobRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/skills', skillRoute);
app.use('/api/user-skills', userSkillRoute);
app.use('/api/job-skills', jobSkillRoute);
app.use('/api/proposals', proposalRoute);
const checkpointRoute = require('./src/modules/checkpoints/checkpoint.route');
app.use('/api/checkpoints', checkpointRoute);
const disputeRoute = require('./src/modules/disputes/dispute.route');
app.use('/api/disputes', disputeRoute);
const contractRoute = require('./src/modules/contracts/contract.route');
app.use('/api/contracts', contractRoute);
const chatRoute = require('./src/modules/chat/chat.route');
app.use('/api/chat', chatRoute);
const notificationRoute = require('./src/modules/notifications/notification.route');
app.use('/api/notifications', notificationRoute);
const reviewRoute = require('./src/modules/reviews/review.route');
app.use('/api/reviews', reviewRoute);
const matchingRoute = require('./src/modules/matching/matching.route');
app.use('/api/matching', matchingRoute);
const adminRoute = require('./src/modules/admin/admin.route');
app.use('/api/admin', adminRoute);

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./src/config/swagger');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// catch 404
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  const errorResponse = {
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  };

  // render the error page
  res.status(err.status || 500);
  res.json(errorResponse);
});

module.exports = app;
