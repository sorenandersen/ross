const DynamoDB = require('aws-sdk/clients/dynamodb');
const DocumentClient = new DynamoDB.DocumentClient();
const log = require('@dazn/lambda-powertools-logger');

const { DDB_TABLE_USERS } = process.env;

module.exports.handler = async (event) => {
  log.debug('create-user event: ', { event });

  const user = {
    id: event.detail.id,
    name: event.detail.name,
    email: event.detail.email,
    createdAt: new Date().toJSON(),
  };

  await DocumentClient.put({
    TableName: DDB_TABLE_USERS,
    Item: user,
    ConditionExpression: 'attribute_not_exists(id)',
  }).promise();
};
