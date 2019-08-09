const https = require('https');

// See @https://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
const to = promise => promise.then(data => [null, data]).catch(err => [err]);

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index += 1) {
    await callback(array[index], index, array);
  }
};

// Perform an https request and return a promise with the result
const promisifiedRequest = (options, postData) =>
  new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      // cumulate data
      let data = '';
      // called when a data chunk is received.
      res.on('data', chunk => {
        data += chunk;
      });

      // called when the complete response is received.
      res.on('end', () => {
        // reject on bad status
        let err;
        if (res.statusCode < 200 || res.statusCode >= 300) {
          err = new Error(`statusCode=${res.statusCode}`);
        }

        let payload = {};

        try {
          payload = JSON.parse(data);
        } catch (e) {
          err = e;
        }

        if (err) {
          err.payload = payload;
          return reject(err);
        }

        return resolve(payload);
      });
    });

    // reject on request error
    req.on('error', err => {
      reject(err);
    });

    // Add the payload
    if (postData) req.write(postData);

    req.end();
  });

module.exports = {
  to,
  asyncForEach,
  promisifiedRequest,
};
