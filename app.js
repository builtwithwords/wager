// modules
const express = require('express');
const passport = require('passport');
require('./passport-config');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/user');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');
require('dotenv').config();

// express
const app = express();

// view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// logs
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// security headers
app.use(helmet());

// session
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
};

app.use(session(sessionConfig));

// limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Get outta here.',
});

app.use(limiter);

// passport
app.use(passport.initialize());
app.use(passport.session());

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(function (err, req, res, next) {
  logger.error(err.stack);
  res.status(500).send('ah, shite!');
});

// serve
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// auth routes
const authRoutes = require('./routes/auth.js');
app.use('/', authRoutes);

// user routes
const userRoutes = require('./routes/userRoutes.js');
app.use('/users', userRoutes);

// https
const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
};

// https server
https.createServer(httpsOptions, app).listen(3000, () => {
  console.log('running...');
});