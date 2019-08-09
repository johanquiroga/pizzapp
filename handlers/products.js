const util = require('util');

const debug = util.debuglog('handlers:products');

const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const middlewares = require('../lib/middlewares');
const utils = require('../lib/utils');

const { to } = utils;

// Products handler
const handler = {};

// Products - post
// Required data: [title, price]
// Optional data: []
handler.post = async req => {
  // Validate that a user is logged in
  if (!(await middlewares.validateAuthUser(req))) {
    return helpers.createResponse({
      status: 401,
      errorMessage: 'You must be logged in to do that',
    });
  }

  // Check that all required fields are filled out
  const title =
    typeof req.body.title === 'string' && req.body.title.trim().length
      ? req.body.title.trim()
      : false;
  const price =
    typeof req.body.price === 'number' && !(req.body.price % 1)
      ? req.body.price
      : false;

  if (!title || !price) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }

  // Create the product object
  const productData = {
    id: helpers.createRandomString(20),
    title,
    price,
  };

  // Store the product
  const [createErr, product] = await to(
    _data.create('products', productData.id, productData)
  );
  if (createErr || !product) {
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not create the new product',
    });
  }

  return helpers.createResponse({ status: 200, payload: { product } });
};

// Products - get
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

  // Check if a product ID was provided
  const hasProductId = typeof req.queryString.id === 'string';

  if (hasProductId) {
    // Get the specified product
    // Check that the id provided is valid
    const productId =
      req.queryString.id.trim().length === 20
        ? req.queryString.id.trim()
        : false;

    if (!productId) {
      return helpers.createResponse({
        status: 400,
        errorMessage: 'Missing required field',
      });
    }

    // Lookup the product
    const [readErr, product] = await to(_data.read('products', productId));
    if (readErr || !product) {
      return helpers.createResponse({
        status: 404,
        errorMessage: 'Could not find the requested Product',
      });
    }

    return helpers.createResponse({ status: 200, payload: { product } });
  }

  // Get all the products
  const [listErr, productsIds] = await to(_data.list('products'));
  if (listErr || !productsIds) {
    debug(listErr);
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find any products',
    });
  }

  // Populate each product data
  const populateProducts = productsIds.map(async productId => {
    const [readErr, product] = await to(_data.read('products', productId));
    if (readErr || !product) {
      debug(readErr);
      return Promise.reject(
        new Error(`Error reading one of the product's data: ${productId}`)
      );
    }
    return product;
  });

  const [populateErr, products] = await to(Promise.all(populateProducts));
  if (populateErr || !products) {
    debug(populateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Error populating products data',
    });
  }

  return helpers.createResponse({ status: 200, payload: { products } });
};

// Products - put
// Required data: [id]
// Optional data: [title, price]
handler.put = async req => {
  // Validate that a user is logged in
  if (!(await middlewares.validateAuthUser(req))) {
    return helpers.createResponse({
      status: 401,
      errorMessage: 'You must be logged in to do that',
    });
  }

  // Check that the id provided is valid
  const id =
    typeof req.queryString.id === 'string' &&
    req.queryString.id.trim().length === 20
      ? req.queryString.id.trim()
      : false;

  // Check for the optional fields
  const title =
    typeof req.body.title === 'string' && req.body.title.trim().length
      ? req.body.title.trim()
      : false;
  const price =
    typeof req.body.price === 'number' && !(req.body.price % 1)
      ? req.body.price
      : false;

  if (!id) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required field',
    });
  }

  // Error if nothing is sent to update
  if (!title && !price) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing fields to update',
    });
  }

  // Lookup the product
  const [readErr, product] = await to(_data.read('products', id));
  if (readErr || !product) {
    debug(readErr);
    return helpers.createResponse({
      status: 400,
      errorMessage: 'The specified product does not exist',
    });
  }

  // Update the fields necessary
  if (title) {
    product.title = title;
  }
  if (price) {
    product.price = price;
  }

  // Store the new updates
  const [updateErr, newProduct] = await to(
    _data.update('products', id, product)
  );
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the product',
    });
  }

  return helpers.createResponse({
    status: 200,
    payload: { product: newProduct },
  });
};

const productsHandler = async req => {
  const acceptableMethods = ['post', 'get', 'put'];
  if (!acceptableMethods.includes(req.method)) {
    return helpers.createResponse({ status: 405 });
  }
  return handler[req.method](req);
};

module.exports = productsHandler;
