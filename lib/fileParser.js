const path = require('path');
const util = require('util');

const debug = util.debuglog('lib:fileParser');

const constants = require('./constants');
const promisified = require('./promiseHelpers');
const utils = require('./utils');

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

const parseFile = async (fileContent, interpolationData, recursiveFn) => {
  const fileValues = extractInterpolationValues(fileContent);

  let parsedFileContent = fileContent;

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

const parseHtml = async (template, interpolationValues = {}) => {
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

  const parsedFileContent = await parseFile(
    fileContent,
    interpolationValues,
    parseHtml
  );

  return parsedFileContent;
};

const parseText = async (template, interpolationValues = {}) => {
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
