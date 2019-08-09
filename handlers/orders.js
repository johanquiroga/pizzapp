const util = require('util');

const debug = util.debuglog('handlers:orders');

const { populateCartItems } = require('./cart');

const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const middlewares = require('../lib/middlewares');
const utils = require('../lib/utils');

const stripe = require('../lib/stripe');
const mailgun = require('../lib/mailgun');

const { to } = utils;

// orders handler
const handler = {};

// orders - post
// Required data: [token]
// Optional data: []
handler.post = async req => {
  // Check that all required fields are filled out
  const token =
    typeof req.body.token === 'string' && req.body.token.trim().length
      ? req.body.token.trim()
      : false;

  if (!token) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }

  // Validate that a user is logged in
  if (!(await middlewares.validateAuthUser(req))) {
    return helpers.createResponse({
      status: 401,
      errorMessage: 'You must be logged in to do that',
    });
  }
  const {
    token: { email },
  } = req.locals;

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested User',
    });
  }

  if (!user.cart.length) {
    return helpers.createResponse({
      status: 400,
      errorMessage:
        'There are no products in your cart. Please add products before creating an order.',
    });
  }

  // Recalculate the total for the price
  const [populateErr, populatedCart] = await to(populateCartItems(user.cart));
  if (populateErr || !populatedCart) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating cart items data',
    });
  }

  // Calculate cart data (total amount, total items)
  const cart = helpers.calculateCartInfo(populatedCart);

  if (!cart.total) {
    return helpers.createResponse({
      status: 400,
      errorMessage:
        'Your cart total is $0. We cannot process orders of that amount. Please add more items to your cart before creating an order.',
    });
  }

  // Create a charge to the users card with stripe
  const [chargeErr, charge] = await to(
    stripe.createCharge({
      amount: cart.total,
      source: token,
    })
  );
  if (chargeErr || !charge) {
    debug(chargeErr);
    return helpers.createResponse({
      status: 500,
      errorMessage:
        chargeErr.message ||
        '\nCould not create a charge for the order. Please try again.',
    });
  }

  // Create the order object
  const orderData = {
    id: helpers.createRandomString(20),
    email,
    items: cart.items, // all cart products populated with their data at the time of purchase
    total: cart.total,
    charge: charge.id, // chargeId
    createdAt: new Date(),
  };

  // Store the order
  const [createErr, order] = await to(
    _data.create('orders', orderData.id, orderData)
  );
  if (createErr || !order) {
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not create the new order',
    });
  }

  // Add order reference to the user
  user.orders.push(order.id);
  // Clean up - clear the users cart, delete CartItems
  user.cart = [];

  // Generate a receipt for the newly created order
  const receiptData = {
    purchase_date: order.createdAt.toUTCString(),
    name: `${user.firstName} ${user.lastName}`,
    total: helpers.formatMoney(order.total),
    payment_method: `${charge.payment_method_details.card.brand} **${charge.payment_method_details.card.last4}`,
    purchase_id: order.id,
    purchase_items: order.items.map(item => ({
      description: `${item.product.title} x${item.quantity}u`,
      amount: helpers.formatMoney(item.product.price * item.quantity),
    })),
  };
  const [parseErr, receipt] = await to(helpers.generateReceipt(receiptData));
  if (parseErr || !receipt.html || !receipt.text) {
    debug(parseErr, receipt);
  } else {
    // Send the receipt to the user registered email
    mailgun.sendMessage({
      to: user.email,
      subject: 'Receipt from Pizzapp',
      text: receipt.text,
      html: receipt.html,
    });
  }

  // Store the user updates
  const [updateErr] = await to(_data.update('users', email, user));
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the user',
    });
  }

  return helpers.createResponse({ status: 200, payload: { order } });
};

// orders - get
// Required data: []
// Optional data: [id]
handler.get = async req => {
  // Validate that a user is logged in
  if (!(await middlewares.validateAuthUser(req))) {
    return helpers.createResponse({
      status: 401,
      errorMessage: 'You must be logged in to do that',
    });
  }
  const {
    token: { email },
  } = req.locals;

  // Check if a order ID was provided
  const hasOrderId = typeof req.queryString.id === 'string';

  if (hasOrderId) {
    // Get the specified order
    // Check that the id provided is valid
    const orderId =
      req.queryString.id.trim().length === 20
        ? req.queryString.id.trim()
        : false;

    if (!orderId) {
      return helpers.createResponse({
        status: 400,
        errorMessage: 'Missing required field',
      });
    }

    // Lookup the order
    const [readErr, order] = await to(_data.read('orders', orderId));
    if (readErr || !order) {
      return helpers.createResponse({
        status: 404,
        errorMessage: 'Could not find the requested order',
      });
    }

    // Only allow users to see details of their own orders
    if (order.email !== email) {
      return helpers.createResponse({
        status: 403,
        errorMessage: "You don't have permission to perform the action",
      });
    }

    return helpers.createResponse({ status: 200, payload: { order } });
  }

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested User',
    });
  }

  // Populate each order data
  const populateOrders = user.orders.map(async orderId => {
    const [readErr, order] = await to(_data.read('orders', orderId));
    if (readErr || !order) {
      debug(readErr);
      return Promise.reject(
        new Error(`Error reading one of the order's data: ${orderId}`)
      );
    }
    return order;
  });
  const [populateErr, orders] = await to(Promise.all(populateOrders));
  if (populateErr || !orders) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating orders data',
    });
  }

  return helpers.createResponse({ status: 200, payload: { orders } });
};

const ordersHandler = async req => {
  const acceptableMethods = ['post', 'get'];
  if (!acceptableMethods.includes(req.method)) {
    return helpers.createResponse({ status: 405 });
  }
  return handler[req.method](req);
};

module.exports = ordersHandler;
