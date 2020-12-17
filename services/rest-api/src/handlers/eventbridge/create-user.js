const Log = require('@dazn/lambda-powertools-logger');

module.exports.handler = async (event) => {
  Log.debug('create-user event: ', { event });

  // TODO persist to DynamoDB
};
