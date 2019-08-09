const path = require('path');
const util = require('util');

const debug = util.debuglog('lib:fileParser');

const constants = require('./constants');
const promisified = require('./promiseHelpers');
const utils = require('./utils');

// Search for dynamic values to be replaced.
// Values are strings that match {{[#reserved_key]  var_name}}
const extractInterpolationValues = input => {
  const reg = constants.extractInterpolationPattern;
  const values = {};
  let match = reg.exec(input);
  while (match !== null) {
    const [key, reservedAction = '', value] = match || [];
    if (reservedAction) {
      values[key] = {
        action: constants.reservedActions[reservedAction.trim()],
        value,
      };
    } else {
      values[key] = { action: 'replace', value };
    }
    match = reg.exec(input);
  }
  return values;
};

// Parse the content of a file with interpolation values passed
const parseFile = async (fileContent, interpolationData, recursiveFn) => {
  // Search and extract dynamic values to be replaced from the template
  const fileValues = extractInterpolationValues(fileContent);

  let parsedFileContent = fileContent;

  // For each value, replace it with the respective interpolation value
  // Process recursively if the template requires another file via a loop
  // Reserved key can be #each to indicate an array of data to be processed with the template assigned to var_name
  // If no reserved key is provided simply interpolate the string with it's respective value.
  await utils.asyncForEach(
    Object.entries(fileValues),
    async ([key, { action, value }]) => {
      let { [value]: replaceValue } = interpolationData;

      if (action === 'repeat') {
        let innerParsed = '';
        await utils.asyncForEach(replaceValue, async data => {
          innerParsed += await recursiveFn(value, data);
        });
        replaceValue = innerParsed;
      }

      parsedFileContent = parsedFileContent.replace(
        new RegExp(key, 'g'),
        replaceValue
      );
    }
  );

  return parsedFileContent;
};

// Parse a template file in html format
const parseHtml = async (template, interpolationValues = {}) => {
  // Read the template from disk
  const baseDir = path.join(__dirname, '../templates');
  const [err, fileContent] = await promisified.readFile(
    `${baseDir}/${template}/${template}.html`,
    'utf-8'
  );
  if (err || !fileContent) {
    const error = err || new Error('Could not load necessary templates');
    debug(error);
    return Promise.reject(error);
  }

  // Parse the file with the interpolation values provided
  const parsedFileContent = await parseFile(
    fileContent,
    interpolationValues,
    parseHtml
  );

  return parsedFileContent;
};

// Parse a template file in text format
const parseText = async (template, interpolationValues = {}) => {
  // Read the template from disk
  const baseDir = path.join(__dirname, '../templates');
  const [err, fileContent] = await promisified.readFile(
    `${baseDir}/${template}/${template}.txt`,
    'utf-8'
  );
  if (err || !fileContent) {
    const error = err || new Error('Could not load necessary templates');
    debug(error);
    return Promise.reject(error);
  }

  // Parse the file with the interpolation values provided
  const parsedFileContent = await parseFile(
    fileContent,
    interpolationValues,
    parseText
  );

  return parsedFileContent;
};

module.exports = {
  parseHtml,
  parseText,
};
