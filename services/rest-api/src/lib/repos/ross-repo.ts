import log from '@dazn/lambda-powertools-logger';
import { AWS_REGION, ddbConfig } from '@svc/config';
import {
  PagedList,
  PagedQueryOptions,
  Region,
  Restaurant,
  RestaurantVisibility,
  Seating,
  SeatingStatus,
  User,
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

export const listRestaurantsByVisibilityAndRegion = async (
  visibility: RestaurantVisibility,
  region: Region,
  queryOptions: PagedQueryOptions = {},
): Promise<PagedList<Restaurant>> => {
  const response = await ddb
    .query({
      TableName: ddbConfig.restaurantsTable,
      IndexName: 'RestaurantsByVisibilityAndRegion',
      KeyConditionExpression: 'visibility = :visibility AND #region = :region',
      ExpressionAttributeValues: {
        ':visibility': visibility,
        ':region': region,
      },
      ExpressionAttributeNames: { '#region': 'region' },
      Limit: queryOptions.limit,
      ...(queryOptions.lastEvaluatedKey && {
        ExclusiveStartKey: {
          id: queryOptions.lastEvaluatedKey,
          visibility,
          region,
        },
      }),
    })
    .promise();

  return {
    lastEvaluatedKey: response.LastEvaluatedKey?.id,
    items: response.Items as Restaurant[],
  };
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

export const updateRestaurantProfilePhotoPath = async (
  restaurantId: string,
  path: string,
) => {
  await ddb
    .update({
      TableName: ddbConfig.restaurantsTable,
      Key: { id: restaurantId },
      UpdateExpression: 'SET profilePhotoUrlPath = :profilePhotoUrlPath',
      ExpressionAttributeValues: {
        ':profilePhotoUrlPath': path,
      },
      ConditionExpression: 'attribute_exists(id)',
    })
    .promise();
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

// ==== Seatings

export const putSeating = async (seating: Seating) => {
  log.debug('repo putSeating: ', { seating });
  try {
    await ddb
      .put({
        TableName: ddbConfig.seatingsTable,
        Item: seating,
        ConditionExpression: 'attribute_not_exists(id)',
      })
      .promise();
  } catch (error) {
    log.error('repo putSeating ERROR', error);
  }
};

export const getSeating = async (seatingId: string, restaurantId: string) => {
  const response = await ddb
    .get({
      TableName: ddbConfig.seatingsTable,
      Key: {
        id: seatingId,
        restaurantId,
      },
    })
    .promise();
  return response.Item as Seating | undefined;
};

export const listSeatingsByRestaurant = async (
  restaurantId: string,
  queryOptions: PagedQueryOptions = {},
): Promise<PagedList<Seating>> => {
  const response = await ddb
    .query({
      TableName: ddbConfig.seatingsTable,
      //IndexName: 'TODO',
      KeyConditionExpression: 'restaurantId = :restaurantId',
      ExpressionAttributeValues: {
        ':restaurantId': restaurantId,
      },
      Limit: queryOptions.limit,
      ...(queryOptions.lastEvaluatedKey && {
        ExclusiveStartKey: {
          id: queryOptions.lastEvaluatedKey,
        },
      }),
    })
    .promise();

  return {
    lastEvaluatedKey: response.LastEvaluatedKey?.id,
    items: response.Items as Seating[],
  };
};

export const updateSeatingStatus = async (
  seatingId: string,
  restaurantId: string,
  status: SeatingStatus,
) => {
  try {
    await ddb
      .update({
        TableName: ddbConfig.seatingsTable,
        Key: {
          id: seatingId,
          restaurantId,
        },
        UpdateExpression: 'SET #status = :status',
        ConditionExpression: 'attribute_exists(id)',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': status,
        },
      })
      .promise();
  } catch (error) {
    log.error('repo updateSeatingStatus ERROR', error);
  }
};

export const deleteSeating = async (
  seatingId: string,
  restaurantId: string,
) => {
  await ddb
    .delete({
      TableName: ddbConfig.seatingsTable,
      Key: {
        id: seatingId,
        restaurantId,
      },
    })
    .promise();
};
