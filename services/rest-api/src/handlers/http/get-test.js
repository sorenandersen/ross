const { add } = require('../../lib/testing-js-to-ts-interop');
const { multiply } = require('../../lib/testing-ts-to-js-interop');

module.exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Test handler',
      add: add(4, 4),
      multiply: multiply(4, 4),
    }),
  };
};
