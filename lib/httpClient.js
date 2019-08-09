const util = require('util');

const debug = util.debuglog('lib:httpClient');

const utils = require('./utils');

/**
 * Class representing a base HTTP Client to perform http requests
 */
class HttpClient {
  /**
   * Set up the http client configuration.
   * @param {string} urlString - Url of the API to be used
   * @param {object} options - Object with the configuration for the http request. See https://nodejs.org/api/http.html#http_http_request_options_callback
   */
  constructor(urlString, options) {
    const url = new URL(urlString);
    this.options = {
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    };
    debug(`Created HTTP client with options: `, this.options);
  }

  /**
   * Makes a GET request to the API
   * @param {string} path - Path to the resource required
   * @param {object} [options={}] - Optional configuration for the GET request. See https://nodejs.org/api/http.html#http_http_request_options_callback
   */
  get(path = '/', options = {}) {
    const requestOptions = {
      ...this.options,
      ...options,
      path: `${this.options.path}${path}`,
      headers: {
        ...this.options.headers,
        ...options.headers,
      },
      method: 'GET',
    };

    debug(`GET request with options: `, requestOptions);

    return utils.promisifiedRequest(requestOptions);
  }

  /**
   * Makes a POST request to the API with the provided data
   * @param {string} path - Full pathname to the resource
   * @param {object} [data={}] - Data to be submitted to the API
   * @param {object} [options={}] - Optional configuration for the GET request. See https://nodejs.org/api/http.html#http_http_request_options_callback
   */
  post(path = '/', data = {}, options = {}) {
    const requestOptions = {
      ...this.options,
      ...options,
      path: `${this.options.path}${path}`,
      headers: {
        ...this.options.headers,
        ...options.headers,
      },
      method: 'POST',
    };

    debug(`POST request with options: `, { ...requestOptions, data });

    return utils.promisifiedRequest(requestOptions, data);
  }
}

module.exports = HttpClient;
