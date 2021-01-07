import log from '@dazn/lambda-powertools-logger';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { updateRestaurantVisibility } from '@svc/lib/repos/ross-repo';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Updates visibility of existing restaurant
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/${
      event.pathParameters?.id
    }/visibility called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const restaurantId = event.pathParameters?.id!;

  // Validate that user is allowed to perform operation
  if (user.restaurantId !== restaurantId) {
    return {
      statusCode: 403,
      body: '',
    };
  }

  // Parse and validate body - expect JSON payload a'la: '{"visibility": "PUBLIC"}'
  const restaurant = JSON.parse(event.body!) as Restaurant;
  if (!restaurant.visibility || !RestaurantVisibility[restaurant.visibility]) {
    // invalid visiblity provided
    return {
      statusCode: 400,
      body: '',
    };
  }

  // Provided visibility is valid. Perform update
  const visibility = RestaurantVisibility[restaurant.visibility];
  await updateRestaurantVisibility(restaurantId, visibility);

  return {
    statusCode: 204,
    body: '',
  };
};
