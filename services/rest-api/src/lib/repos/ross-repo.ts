import log from '@dazn/lambda-powertools-logger';
import { AWS_REGION, ddbConfig } from '@svc/config';
import {
  User,
  Restaurant,
  RestaurantVisibility,
} from '@svc/lib/types/ross-types';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

const ddb = new DocumentClient({ region: AWS_REGION });

// ==== Users

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

// ==== Restaurants

export const putRestaurant = async (restaurant: Restaurant) => {
  log.debug('repo putRestaurant: ', { restaurant });
  try {
    await ddb
      .put({
        TableName: ddbConfig.restaurantsTable,
        Item: restaurant,
        ConditionExpression: 'attribute_not_exists(id)',
      })
      .promise();
  } catch (error) {
    log.error('repo putRestaurant ERROR', error);
  }
};

export const getRestaurant = async (id: string) => {
  const response = await ddb
    .get({
      TableName: ddbConfig.restaurantsTable,
      Key: {
        id,
      },
    })
    .promise();
  return response.Item as Restaurant | undefined;
};

export const updateRestaurantVisibility = async (
  restaurantId: string,
  visibility: RestaurantVisibility,
) => {
  try {
    await ddb
      .update({
        TableName: ddbConfig.restaurantsTable,
        Key: {
          id: restaurantId,
        },
        UpdateExpression: 'SET visibility = :visibility',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeValues: {
          ':visibility': visibility,
        },
      })
      .promise();
  } catch (error) {
    log.error('repo updateRestaurantVisibility ERROR', error);
  }
};

export const deleteRestaurant = async (id: string) => {
  await ddb
    .delete({
      TableName: ddbConfig.restaurantsTable,
      Key: {
        id,
      },
    })
    .promise();
};
