import log from '@dazn/lambda-powertools-logger';
import { AWS_REGION, ddbConfig } from '@svc/config';
import { User } from '@svc/lib/types/ross-types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const ddb = new DocumentClient({ region: AWS_REGION });

export const putUser = async (user: User) => {
  log.debug('repo putUser user: ', user);
  try {
    await ddb
      .put({
        TableName: ddbConfig.usersTable,
        Item: user,
        ConditionExpression: 'attribute_not_exists(id)',
      })
      .promise();
  } catch (error) {
    log.error('repo putUser ERROR', error);
  }
};

export const getUser = async (id: string) => {
  const response = await ddb
    .get({
      TableName: ddbConfig.usersTable,
      Key: {
        id,
      },
    })
    .promise();
  return response.Item as User | undefined;
};

export const deleteUser = async (id: string) => {
  await ddb
    .delete({
      TableName: ddbConfig.usersTable,
      Key: {
        id,
      },
    })
    .promise();
};
