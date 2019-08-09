module.exports = {
  emailPattern: /\S+@\S+\.\S+/,
  extractInterpolationPattern: /\{\{\s*(#each\s+)?([^{}\s]*)\s*\}\}/gm,
  reservedActions: {
    '#each': 'repeat',
  },
  reservedFiles: ['.gitignore'],
};
