const fs = require('fs');
const util = require('util');

const utils = require('./utils');

const helpers = {};

helpers.open = async (...args) => utils.to(util.promisify(fs.open)(...args));

helpers.writeFile = async (...args) =>
  utils.to(util.promisify(fs.writeFile)(...args));

helpers.readFile = async (...args) =>
  utils.to(util.promisify(fs.readFile)(...args));

helpers.close = async (...args) => utils.to(util.promisify(fs.close)(...args));

helpers.ftruncate = async (...args) =>
  utils.to(util.promisify(fs.ftruncate)(...args));

helpers.unlink = async (...args) =>
  utils.to(util.promisify(fs.unlink)(...args));

helpers.readdir = async (...args) =>
  utils.to(util.promisify(fs.readdir)(...args));

module.exports = helpers;
