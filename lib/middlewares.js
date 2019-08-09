const util = require('util');

const debug = util.debuglog('lib:middlewares');

const _data = require('./data');
const utils = require('./utils');

const getTokenFromTokenHeader = req =>
  typeof req.headers.token === 'string' ? req.headers.token : null;

// Validate that a user is logged in based on the token from the headers
const validateAuthUser = async req => {
  // Get the token from the headers
  const tokenId = getTokenFromTokenHeader(req);

  // Lookup the token
  const [err, token] = await utils.to(_data.read('tokens', tokenId));
  if (err || !token || token.expires < Date.now()) {
    return false;
  }
  req.locals.token = token;
  return true;
};

// Verify if a given token id is currently valid for a given user
const verifyToken = async (req, email) => {
  // Validate that a user is logged in
  if (!(await validateAuthUser(req))) {
    return false;
  }

  // Get the token from the headers
  const { token } = req.locals;
  // Check that the token is for the given user and has not expired
  if (token.email !== email) {
    return false;
  }

  return true;
};

module.exports = {
  validateAuthUser,
  verifyToken,
};
