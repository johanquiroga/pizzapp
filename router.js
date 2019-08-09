/**
 *  Define a requests router
 */

const handlers = require('./handlers');

const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  products: handlers.products,
  cart: handlers.cart,
  orders: handlers.orders,
};

module.exports = router;
