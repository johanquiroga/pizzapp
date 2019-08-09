const helpers = require('../lib/helpers');

const users = require('./users');
const tokens = require('./tokens').default;
const products = require('./products');
const cart = require('./cart').default;
const orders = require('./orders');

// Ping handler
const ping = async req => helpers.createResponse({ status: 200, payload: req });

// Not Found handler
const notFound = async () => helpers.createResponse({ status: 404 });

module.exports = {
  ping,
  users,
  tokens,
  products,
  cart,
  orders,
  notFound,
};
