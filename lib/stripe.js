const util = require('util');
const querystring = require('querystring');

const debug = util.debuglog('lib:stripe');

const HttpsClient = require('./httpClient');
const config = require('./config');
const utils = require('./utils');

const { to } = utils;

/**
 * Class representing an Http Client for the Stripe REST API.
 * @extends HttpsClient
 */
class StripeClient extends HttpsClient {
  /**
   * Set up the http client configuration.
   */
  constructor() {
    super(`${config.stripe.url}/v1`, {
      headers: {
        Authorization: `Bearer ${config.stripe.key}`,
      },
    });
  }

  /**
   * Makes a GET request to the API
   * @param {string} path - Path to the resource required
   * @param {object} [options={}] - Optional configuration for the GET request. See https://nodejs.org/api/http.html#http_http_request_options_callback
   */
  get(path, options) {
    return super.get(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  }

  /**
   * Makes a POST request to the API with the provided data
   * @param {string} path - Full pathname to the resource
   * @param {object} [data={}] - Data to be submitted to the API
   * @param {object} [options={}] - Optional configuration for the GET request. See https://nodejs.org/api/http.html#http_http_request_options_callback
   */
  post(path, data = {}, options = {}) {
    // Stringify the payload
    const stringPostData = querystring.stringify(data);

    return super.post(path, stringPostData, {
      ...options,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPostData),
        ...(options.headers || {}),
      },
    });
  }
}

// Instantiate an Stripe HTTP Client
const stripeClient = new StripeClient();

// Create container to expose the methods that will connect to the Stripe REST API
const stripeApi = {};

/**
 * Create an USD charge  of the indicated amount to the indicated card.
 * @param {object} chargeData - Data of the charge that will be created. See https://stripe.com/docs/api/charges/create
 * @param {number} chargeData.amount - Integer indicating the amount in cents to be charged to the card
 * @param {string} chargeData.source - Token of the card that will be charged
 * @returns {object} Result of the charge attempt
 * @throws Error indicating that the charge could not be made
 */
stripeApi.createCharge = async chargeData => {
  const [err, charge] = await to(
    stripeClient.post(`/charges`, {
      ...chargeData,
      currency: 'usd',
    })
  );

  if (err || !charge) {
    debug(err);
    return new Error(err.message || 'Could not create charge');
  }

  return charge;
};

module.exports = stripeApi;
