const util = require('util');

const debug = util.debuglog('handlers:cart');

const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const middlewares = require('../lib/middlewares');
const utils = require('../lib/utils');

const { to } = utils;

// Populate each product inside the user's cart
const populateCartItems = cart => {
  const populateCart = cart.map(async cartItem => {
    const [readErr, product] = await to(
      _data.read('products', cartItem.product)
    );
    if (readErr || !product) {
      debug(readErr);
      return Promise.reject(
        new Error(
          `Error reading one of the product's data: ${cartItem.product}`
        )
      );
    }
    return { ...cartItem, product };
  });

  return Promise.all(populateCart);
};

// carts handler
const handler = {};

// carts - post
// Required data: [productId, quantity]
// Optional data: []
handler.post = async req => {
  // Check that all required fields are filled out
  const productId =
    typeof req.body.product === 'string' &&
    req.body.product.trim().length === 20
      ? req.body.product.trim()
      : false;
  const quantity =
    typeof req.body.quantity === 'number' &&
    !(req.body.quantity % 1) &&
    req.body.quantity > 0
      ? req.body.quantity
      : false;

  if (!productId || !quantity) {
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

  // Lookup the product
  const [readErr, product] = await to(_data.read('products', productId));
  if (readErr || !product) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested Product',
    });
  }

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested User',
    });
  }

  // Check if the product exists in the user's cart
  const cartItemIdx = user.cart.findIndex(item => item.product === productId);
  if (cartItemIdx !== -1) {
    // The product is already in the cart, so add up the quantity on the existing entry
    user.cart[cartItemIdx].quantity += quantity;
  } else {
    // The product is not in the cart, so create and add the cart item object
    const cartItem = {
      product: productId,
      quantity,
    };

    user.cart.push(cartItem);
  }

  // Store the cart updates
  const [updateErr, newUser] = await to(_data.update('users', email, user));
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the user',
    });
  }

  const [populateErr, populatedCart] = await to(
    populateCartItems(newUser.cart)
  );
  if (populateErr || !populatedCart) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating cart items data',
    });
  }

  const cart = helpers.calculateCartInfo(populatedCart);

  return helpers.createResponse({
    status: 200,
    payload: {
      cart,
    },
  });
};

// carts - get
// Required data: []
// Optional data: []
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

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested User',
    });
  }

  const [populateErr, populatedCart] = await to(populateCartItems(user.cart));
  if (populateErr || !populatedCart) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating cart items data',
    });
  }

  const cart = helpers.calculateCartInfo(populatedCart);

  return helpers.createResponse({
    status: 200,
    payload: {
      cart,
    },
  });
};

// carts - put
// Required data: [productId, quantity]
// Optional data: []
handler.put = async req => {
  const productId =
    typeof req.body.product === 'string' &&
    req.body.product.trim().length === 20
      ? req.body.product.trim()
      : false;
  const quantity =
    typeof req.body.quantity === 'number' &&
    !(req.body.quantity % 1) &&
    req.body.quantity > 0
      ? req.body.quantity
      : false;

  if (!productId || !quantity) {
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

  // Lookup the product
  const [readErr, product] = await to(_data.read('products', productId));
  if (readErr || !product) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested Product',
    });
  }

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 404,
      errorMessage: 'Could not find the requested User',
    });
  }

  // Check if the product exists in the user's cart
  const cartItemIdx = user.cart.findIndex(item => item.product === productId);
  if (cartItemIdx === -1) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find the product in the users cart',
    });
  }

  // Update the quantity of the cart item
  user.cart[cartItemIdx].quantity = quantity;

  // Store the cart updates
  const [updateErr, newUser] = await to(_data.update('users', email, user));
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the user',
    });
  }

  const [populateErr, populatedCart] = await to(
    populateCartItems(newUser.cart)
  );
  if (populateErr || !populatedCart) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating cart items data',
    });
  }

  const cart = helpers.calculateCartInfo(populatedCart);

  return helpers.createResponse({
    status: 200,
    payload: {
      cart,
    },
  });
};

// carts - delete
// Required data: [productId]
// Optional data: []
handler.delete = async req => {
  // Check that all required fields are filled out
  const productId =
    typeof req.body.product === 'string' &&
    req.body.product.trim().length === 20
      ? req.body.product.trim()
      : false;

  if (!productId) {
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

  // Check if the product exists in the user's cart
  const cartItemIdx = user.cart.findIndex(item => item.product === productId);
  if (cartItemIdx === -1) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find the product in the users cart',
    });
  }

  // Remove the product from the user's cart
  user.cart = [
    ...user.cart.slice(0, cartItemIdx),
    ...user.cart.slice(cartItemIdx + 1),
  ];

  // Store the cart updates
  const [updateErr, newUser] = await to(_data.update('users', email, user));
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the user',
    });
  }

  const [populateErr, populatedCart] = await to(
    populateCartItems(newUser.cart)
  );
  if (populateErr || !populatedCart) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating cart items data',
    });
  }

  const cart = helpers.calculateCartInfo(populatedCart);

  return helpers.createResponse({
    status: 200,
    payload: {
      cart,
    },
  });
};

const cartHandler = async req => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    return helpers.createResponse({ status: 405 });
  }
  return handler[req.method](req);
};

exports.populateCartItems = populateCartItems;
exports.default = cartHandler;
