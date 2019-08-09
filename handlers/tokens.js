const util = require('util');

const debug = util.debuglog('handlers:tokens');

const { emailPattern } = require('../lib/constants');
const config = require('../lib/config');
const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const middlewares = require('../lib/middlewares');
const utils = require('../lib/utils');

const { to } = utils;

// Tokens handler
const handler = {};

// Tokens - post
// Required data: [email, password]
// Optional data: []
handler.post = async req => {
  const email =
    typeof req.body.email === 'string' &&
    emailPattern.test(req.body.email.trim())
      ? req.body.email.trim()
      : false;
  const password =
    typeof req.body.password === 'string' && req.body.password.trim().length
      ? req.body.password.trim()
      : false;
  if (!email || !password) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }

  // Lookup the user who matches that email
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    debug(err);
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find the specified user',
    });
  }

  // Hash the sent password, and compare it to the password stored in the user object
  const hashedPassword = helpers.hash(password);
  if (hashedPassword !== user.password) {
    return helpers.createResponse({
      status: 400,
      errorMessage:
        "Password did not match the specified user's stored password",
    });
  }

  // If valid, create a new token with a random name. Set expiration date 1 hour in the future
  const tokenId = helpers.createRandomString(20);
  const expires = Date.now() + config.passwordExp;
  const token = { email, id: tokenId, expires };

  // Store the token
  const [createErr] = await to(_data.create('tokens', tokenId, token));
  if (createErr) {
    debug(createErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not create the new token',
    });
  }

  return helpers.createResponse({ status: 200, payload: { token } });
};

// Tokens - get
// Required data: [id]
// Optional data: []
handler.get = async req => {
  // Check that the id provided is valid
  const id =
    typeof req.queryString.id === 'string' &&
    req.queryString.id.trim().length === 20
      ? req.queryString.id.trim()
      : false;

  if (!id) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required field',
    });
  }

  // Lookup the token
  const [err, token] = await to(_data.read('tokens', id));
  if (err || !token) {
    debug(err);
    return helpers.createResponse({ status: 404 });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, token.email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
    });
  }

  return helpers.createResponse({ status: 200, payload: { token } });
};

// Tokens - put
// Required data: [id, extend]
// Optional data: []
handler.put = async req => {
  const id =
    typeof req.body.id === 'string' && req.body.id.trim().length === 20
      ? req.body.id.trim()
      : false;
  const extend =
    typeof req.body.extend === 'boolean' && req.body.extend
      ? req.body.extend
      : false;
  if (!id || !extend) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required field(s) or field(s) are invalid',
    });
  }

  // Lookup the token
  const [err, token] = await to(_data.read('tokens', id));
  if (err || !token) {
    debug(err);
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not found the specified token',
    });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, token.email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
    });
  }

  // Check to make sure the token isn't already expired
  if (token.expires < Date.now()) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'The token has already expired and cannot be extended',
    });
  }

  // Set the expiration an hour from now
  token.expires = Date.now() + config.passwordExp;

  // Store the new updates
  const [updateErr] = await to(_data.update('tokens', id, token));
  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: "Could not update the token's expiration",
    });
  }

  return helpers.createResponse({ status: 200 });
};

// Tokens - delete
handler.delete = async req => {
  // Check that the id provided is valid
  const id =
    typeof req.queryString.id === 'string' &&
    req.queryString.id.trim().length === 20
      ? req.queryString.id.trim()
      : false;

  if (!id) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required field',
    });
  }

  // Lookup the token
  const [err, token] = await to(_data.read('tokens', id));
  if (err || !token) {
    debug(err);
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find the specified token',
    });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, token.email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
    });
  }

  // Destroy the user token
  const [deleteErr] = await to(_data.delete('tokens', id));
  if (deleteErr) {
    debug(deleteErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not delete the specified token',
    });
  }

  return helpers.createResponse({ status: 200 });
};

const tokensHandler = async req => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    return helpers.createResponse({ status: 405 });
  }
  return handler[req.method](req);
};

exports.default = tokensHandler;
