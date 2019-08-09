/**
 * Library for storing and editing data
 */

// Dependencies
const path = require('path');
const util = require('util');

const debug = util.debuglog('lib:data');

const helpers = require('./helpers');
const promisified = require('./promiseHelpers');
const constants = require('./constants');

// Container for the module (to be exporte)
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '../.data/');

// Write data to a file
lib.create = async (dir, file, data) => {
  // Open the file for writing
  const [openErr, fileDescriptor] = await promisified.open(
    `${lib.baseDir}${dir}/${file}.json`,
    'wx'
  );
  if (openErr || !fileDescriptor) {
    debug(openErr);
    return Promise.reject(
      new Error('Could not create new file, it may already exists')
    );
  }
  // Convert data to string
  const stringData = JSON.stringify(data);

  // Write to file and close it
  const [writeErr] = await promisified.writeFile(fileDescriptor, stringData);
  if (writeErr) {
    debug(writeErr);
    return Promise.reject(new Error('Error writing to new file'));
  }

  const [closeErr] = await promisified.close(fileDescriptor);
  if (closeErr) {
    debug(closeErr);
    return Promise.reject(new Error('Error closing new file'));
  }

  return data;
};

// Read data from a file
lib.read = async (dir, file) => {
  const [err, data] = await promisified.readFile(
    `${lib.baseDir}${dir}/${file}.json`,
    'utf-8'
  );

  if (err || !data) {
    debug(err);
    return Promise.reject(new Error('Could not read file'));
  }
  return helpers.parseJsonToObject(data);
};

// Update data from a file
lib.update = async (dir, file, data) => {
  // Open the file for writing
  const [openErr, fileDescriptor] = await promisified.open(
    `${lib.baseDir}${dir}/${file}.json`,
    'r+'
  );
  if (openErr || !fileDescriptor) {
    debug(openErr);
    return Promise.reject(
      new Error('Could not open the file for updating, it may not exist yet')
    );
  }

  // Convert data to string
  const stringData = JSON.stringify(data);

  // Truncate the file
  const [truncateErr] = await promisified.ftruncate(fileDescriptor);
  if (truncateErr) {
    debug(truncateErr);
    return Promise.reject(new Error('Error truncating file'));
  }

  // Write to file and close it
  const [writeErr] = await promisified.writeFile(fileDescriptor, stringData);
  if (writeErr) {
    debug(writeErr);
    return Promise.reject(new Error('Error writing to new file'));
  }

  const [closeErr] = await promisified.close(fileDescriptor);
  if (closeErr) {
    debug(closeErr);
    return Promise.reject(new Error('Error closing new file'));
  }

  return data;
};

// Delete a file
lib.delete = async (dir, file) => {
  // Unlink the file
  const [err] = await promisified.unlink(`${lib.baseDir}${dir}/${file}.json`);
  if (err) {
    debug(err);
    return Promise.reject(new Error('Error deleting the file'));
  }
};

// List all the items in a directory
lib.list = async dir => {
  const [err, data] = await promisified.readdir(`${lib.baseDir}${dir}/`);
  if (err || !data) {
    debug(err);
    return Promise.reject(err);
  }

  const trimmedFileNames = data
    .filter(fileName => !constants.reservedFiles.includes(fileName))
    .map(fileName => fileName.replace('.json', ''));

  return trimmedFileNames;
};

// Export the Module
module.exports = lib;
