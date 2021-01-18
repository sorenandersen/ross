import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import { errorMessages } from '@svc/lib/validation/messages';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { updateRestaurantVisibility } from '@svc/lib/repos/ross-repo';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';

/**
 * Updates visibility of existing restaurant
 */
export const handler = wrap(async (event) => {
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
    throw new createError.Forbidden(errorMessages.forbidden);
  }

  // Parse and validate body - expect JSON payload a'la: '{"visibility": "PUBLIC"}'
  const restaurant = JSON.parse(event.body || '{}') as Restaurant;
  const visibility = restaurant.visibility?.toUpperCase() as RestaurantVisibility;
  if (!RestaurantVisibility[visibility]) {
    throw new createError.BadRequest(
      'No visiblity provided. Pass visiblity in the request body.',
    );
  }

  // Provided visibility is valid. Perform update
  await updateRestaurantVisibility(restaurantId, visibility);

  return {
    statusCode: 204,
    body: '',
  };
});
