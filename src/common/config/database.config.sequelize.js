'use strict';

require('dotenv').config();

const base = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'app_dev',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql'
};

module.exports = {
  development: base,
  test: {
    ...base,
    database: process.env.DB_NAME || 'app_test'
  },
  production: base
};
