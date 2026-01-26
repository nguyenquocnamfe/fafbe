module.exports = app => {
  app.use('/auth', require('./modules/auth/auth.route'));
};
