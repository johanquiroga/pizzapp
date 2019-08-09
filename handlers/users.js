const util = require('util');

const debug = util.debuglog('handlers:users');

const { emailPattern } = require('../lib/constants');
const _data = require('../lib/data');
const helpers = require('../lib/helpers');
const middlewares = require('../lib/middlewares');
const utils = require('../lib/utils');

const { to } = utils;

// Users handler
const handler = {};

// Users - post
// Required data: [firstName, lastName, email, password, address]
// Optional data: []
handler.post = async req => {
  // Check that all required fields are filled out
  const firstName =
    typeof req.body.firstName === 'string' && req.body.firstName.trim().length
      ? req.body.firstName.trim()
      : false;
  const lastName =
    typeof req.body.lastName === 'string' && req.body.lastName.trim().length
      ? req.body.lastName.trim()
      : false;
  const email =
    typeof req.body.email === 'string' &&
    emailPattern.test(req.body.email.trim())
      ? req.body.email.trim()
      : false;
  const password =
    typeof req.body.password === 'string' && req.body.password.trim().length
      ? req.body.password.trim()
      : false;
  const address =
    typeof req.body.address === 'string' && req.body.address.trim().length
      ? req.body.address.trim()
      : false;

  if (!firstName || !lastName || !email || !password || !address) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }

  // Make sure that the user doesn't already exist
  const [readErr] = await to(_data.read('users', email));
  if (!readErr) {
    // User already exists
    return helpers.createResponse({
      status: 400,
      errorMessage: 'A user with that email already exists',
    });
  }

  // Hash the password
  const hashedPassword = helpers.hash(password);
  if (!hashedPassword) {
    return helpers.createResponse({
      status: 500,
      errorMessage: "Could not hash the user's password",
    });
  }
  // Create the user object
  const user = {
    firstName,
    lastName,
    email,
    password: hashedPassword,
    address,
    cart: [],
    orders: [],
  };

  // Store the user
  const [saveErr, newUser] = await to(_data.create('users', email, user));
  if (saveErr) {
    debug(saveErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not create the new User',
    });
  }
  delete newUser.password;
  return helpers.createResponse({ status: 200, payload: { user: newUser } });
};

// Users - get
// Required data: [email]
// Optional data: []
handler.get = async req => {
  // Check that the email provided is valid
  const email =
    typeof req.queryString.email === 'string' &&
    emailPattern.test(req.queryString.email.trim())
      ? req.queryString.email.trim()
      : false;

  if (!email) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required field',
    });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
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
  // Remove the hashed password from the user before returning it to the requester
  delete user.password;
  return helpers.createResponse({
    status: 200,
    payload: { user },
  });
};

// Users - put
// Required data: [email]
// Optional data: [firstName, lastName, email, password, address] - At least one must be specified
handler.put = async req => {
  // Check for the required field
  const email =
    typeof req.body.email === 'string' &&
    emailPattern.test(req.body.email.trim())
      ? req.body.email.trim()
      : false;

  // Check for the optional fields
  const firstName =
    typeof req.body.firstName === 'string' && req.body.firstName.trim().length
      ? req.body.firstName.trim()
      : false;
  const lastName =
    typeof req.body.lastName === 'string' && req.body.lastName.trim().length
      ? req.body.lastName.trim()
      : false;
  const password =
    typeof req.body.password === 'string' && req.body.password.trim().length
      ? req.body.password.trim()
      : false;
  const address =
    typeof req.body.address === 'string' && req.body.address.trim().length
      ? req.body.address.trim()
      : false;

  // Error if the email is invalid
  if (!email) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }
  // Error if nothing is sent to update
  if (!firstName && !lastName && !password && !address) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing fields to update',
    });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
    });
  }

  // Lookup the user
  const [readErr, user] = await to(_data.read('users', email));
  if (readErr || !user) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'The specified user does not exist',
    });
  }

  // Update the fields necessary
  if (firstName) {
    user.firstName = firstName;
  }
  if (lastName) {
    user.lastName = lastName;
  }
  if (password) {
    user.password = helpers.hash(password);
  }
  if (address) {
    user.address = address;
  }

  // Store the new updates
  const [updateErr, newUser] = await to(_data.update('users', email, user));

  if (updateErr) {
    debug(updateErr);
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not update the user',
    });
  }

  delete newUser.password;
  return helpers.createResponse({
    status: 200,
    payload: { user: newUser },
  });
};

// Users - delete
// Required data: [email]
handler.delete = async req => {
  // Check that the phone number provided is valid
  const email =
    typeof req.queryString.email === 'string' &&
    emailPattern.test(req.queryString.email.trim())
      ? req.queryString.email.trim()
      : false;

  // Error if the phone is invalid
  if (!email) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Missing required fields',
    });
  }

  // Verify that the given token is valid for the email
  const isTokenValid = await middlewares.verifyToken(req, email);
  if (!isTokenValid) {
    return helpers.createResponse({
      status: 403,
      errorMessage: 'Missing required token in header, or token is invalid',
    });
  }

  // Lookup the user
  const [err, user] = await to(_data.read('users', email));
  if (err || !user) {
    return helpers.createResponse({
      status: 400,
      errorMessage: 'Could not find the specified user',
    });
  }

  const [deleteErr] = await to(_data.delete('users', email));
  if (deleteErr) {
    return helpers.createResponse({
      status: 500,
      errorMessage: 'Could not delete the specified user',
    });
  }

  return helpers.createResponse({ status: 200 });
};

const usersHandler = async req => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (!acceptableMethods.includes(req.method)) {
    return helpers.createResponse({ status: 405 });
  }
  return handler[req.method](req);
};

module.exports = usersHandler;
