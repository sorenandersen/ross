import log from '@dazn/lambda-powertools-logger';
import uuid from '@svc/lib/uuid';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { assignRestaurantToUser } from '@svc/lib/auth/cognito-util';
import { putRestaurant } from '@svc/lib/repos/ross-repo';
import {
  Restaurant,
  RestaurantApprovalStatus,
  RestaurantVisibility,
  UserRole,
} from '@svc/lib/types/ross-types';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);

  const restaurant = JSON.parse(event.body!) as Restaurant;

  // TODO validate restaurant (and user? - or do we allow the user to create multiple restaurants; which would effectively leave all but the latest one orphaned ...)
  // *
  // *
  // *

  // Set defaults
  restaurant.id = uuid();
  restaurant.approvalStatus = RestaurantApprovalStatus.APPROVED; // For a future version, a RossAdmin should approve new restaurants before managers can operate on them.
  restaurant.visibility = RestaurantVisibility.PRIVATE;
  restaurant.managerId = user.id;
  restaurant.createdAt = new Date().toISOString();

  // Update Cognito user to be a manager of the new restaurant
  await assignRestaurantToUser(user.id, restaurant.id, UserRole.MANAGER);

  try {
    // Persist new restaurant
    await putRestaurant(restaurant);
  } catch (error) {
    // Failure inserting to DynamoDB
    log.info(
      'Failure persisting new restaurant; now attempting rollback: Reset Cognito restaurant assignment for user',
      {
        user,
        restaurant,
      },
    );

    // Attempt rollback: Remove restaurant assignment
    try {
      await assignRestaurantToUser(user.id);

      log.info('Rollback success; user no longer associated with restaurant', {
        userId: user.id,
      });
    } catch (error) {
      log.warn(
        'Rollback failure; user left associated with restaurant that failed to persist',
        {
          user,
          restaurant,
        },
      );
    }

    // Signal error
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Failed to persist restaurant` }),
    };
  }

  return {
    statusCode: 201,
    headers: { location: `/restaurants/${restaurant.id}` },
    body: JSON.stringify({ id: restaurant.id }),
  };
};
