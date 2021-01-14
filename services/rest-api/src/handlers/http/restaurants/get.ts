import log from '@dazn/lambda-powertools-logger';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import createError from 'http-errors';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { getRestaurant } from '@svc/lib/repos/ross-repo';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';

/**
 * Gets a specific restaurant
 */
export const handler = wrap(async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/${
      event.pathParameters?.id
    } called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const restaurantId = event.pathParameters?.id!;
  let restaurant: Restaurant | undefined;

  if (!user.restaurantId) {
    // **
    // Customer role
    // **
    restaurant = await getRestaurant(restaurantId);
    if (!restaurant || restaurant.visibility !== RestaurantVisibility.PUBLIC) {
      throw new createError.NotFound();
    }
  } else {
    // **
    // Manager or Staff role
    // **
    // Validate that equested restaurant is associated with requesting user
    if (user.restaurantId !== restaurantId) {
      throw new createError.Forbidden();
    }
  }

  // Get restaurant from DB if not already retrieved
  if (!restaurant) restaurant = await getRestaurant(restaurantId);

  return {
    statusCode: 200,
    body: JSON.stringify({ ...restaurant }),
  };
});
