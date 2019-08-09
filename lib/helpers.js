/**
 * Helpers for various tasks
 */

const crypto = require('crypto');

const config = require('./config');
const errors = require('./errors');
const fileParser = require('./fileParser');

const helpers = {};

// Create a SHA256 Hash
helpers.hash = str => {
  if (typeof str === 'string' && str.length) {
    const hash = crypto
      .createHmac('sha256', config.hashSecret)
      .update(str)
      .digest('hex');
    return hash;
  }
  return false;
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = length => {
  const strLength = typeof length === 'number' && length ? length : false;
  if (strLength) {
    // Define all tha possible characters that could go into the string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Start the final string
    let str = '';
    for (let i = 0; i < strLength; i += 1) {
      // Get a random character from the possibleCharacters string
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );
      // Append this character to the final string
      str += randomCharacter;
    }
    return str;
  }
  return false;
};

// Create an application standard http response to be sent to the client
helpers.createResponse = ({ status = 200, payload, errorMessage }) => {
  const success = !(status >= 400);
  let error;
  if (!success) {
    error = {
      statusCode: status,
      error: errors[status] || errors[500],
      message: errorMessage,
    };
  }
  return {
    status,
    res: {
      success,
      data: payload,
      error,
    },
  };
};

// calculate user's cart total price and items count
helpers.calculateCartInfo = cart => {
  const { total, count } = cart.reduce(
    (tally, cartItem) => ({
      total: tally.total + cartItem.product.price * cartItem.quantity,
      count: tally.count + cartItem.quantity,
    }),
    { total: 0, count: 0 }
  );

  return { total, count, items: cart };
};

// Generate an html and txt receipts for a successful purchase.
// This receipt will be sent to the respective user.
helpers.generateReceipt = async (receiptData = {}) => {
  const appInformation = {
    app_name: config.app.name,
    app_url: config.app.domain,
    support_url: config.app.supportUrl,
  };
  const parseFiles = [
    fileParser.parseHtml('receipt', { ...appInformation, ...receiptData }),
    fileParser.parseText('receipt', { ...appInformation, ...receiptData }),
  ];

  const [htmlReceipt, textReceipt] = await Promise.all(parseFiles);

  return {
    html: htmlReceipt,
    text: textReceipt,
  };
};

// Format a price amount given in cents to an amount in dollars.
helpers.formatMoney = amount => {
  const options = {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  };
  // if its a whole, dollar amount, leave off the .00
  if (amount % 100 === 0) options.minimumFractionDigits = 0;
  const formatter = new Intl.NumberFormat('en-US', options);
  return formatter.format(amount / 100);
};

module.exports = helpers;
