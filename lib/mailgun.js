const util = require('util');
const querystring = require('querystring');

const debug = util.debuglog('lib:mailgun');

const HttpsClient = require('./httpClient');
const config = require('./config');
const utils = require('./utils');

const { to } = utils;

/**
 * Class representing an Http Client for the Mailgun REST API.
 * @extends HttpsClient
 */
class MailgunClient extends HttpsClient {
  /**
   * Set up the http client configuration.
   */
  constructor() {
    super(`${config.mailgun.url}/${config.mailgun.domain}`, {
      auth: `api:${config.mailgun.key}`,
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

// Instantiate an Mailgun HTTP Client
const mailgunClient = new MailgunClient();

// Create container to expose the methods that will connect to the Mailgun REST API
const mailgunApi = {};

/**
 * Create a message to send to the specified email
 * @param {object} messageData - Data of the message that will be created. See https://documentation.mailgun.com/en/latest/api-sending.html#sending
 * @param {(string|string[])} messageData.to - Email address of the recipient(s).
 * @param {string} messageData.subject - Message subject
 * @param {string} [messageData.text] - Body of the message. (text version)
 * @param {string} [messageData.html] - Body of the message. (HTML version)
 * @returns {object} Result of the message attempt
 * @throws Error indicating that the message could not be sent
 */
mailgunApi.sendMessage = async messageData => {
  debug('Attempting to send a message to: ', messageData.to);

  if (!messageData.to || !messageData.to.length) {
    const err = new Error('A recipient for the message must be supplied');
    debug(err);
    return Promise.reject(err);
  }
  if (!messageData.subject) {
    const err = new Error('A subject for the message must be supplied');
    debug(err);
    return Promise.reject(err);
  }
  if (!messageData.text && !messageData.html) {
    const err = new Error('A body for the message must be supplied');
    debug(err);
    return Promise.reject(err);
  }
  const [err, message] = await to(
    mailgunClient.post(`/messages`, {
      ...messageData,
      from: config.mailgun.from.replace(':domain', config.mailgun.domain),
    })
  );

  if (err || !message) {
    debug(err);
    return Promise.reject(new Error(err.message || 'Could not create message'));
  }

  debug('Message sent: ', message);

  return message;
};

module.exports = mailgunApi;
