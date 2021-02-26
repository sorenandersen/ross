import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import { errorMessages } from '@svc/lib/validation/messages';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { listSeatingsByRestaurant } from '@svc/lib/repos/ross-repo';
import {
  Region,
  RestaurantVisibility,
  Seating,
  SeatingStatus,
} from '@svc/lib/types/ross-types';
import { PagedList, PagedQueryOptions } from '@svc/lib/types/ross-types';

/**
 * Gets list of upcoming seatings for the specified restaurant
 */
export const handler = wrap(async (event) => {
  const restaurantId = event.pathParameters?.restaurantId!;

  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} ${
      event.rawPath
    } called`,
    { event },
  );

  // Validate that StaffUser is requesting resources for his associated restaurant
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  if (user.restaurantId !== restaurantId) {
    throw new createError.Forbidden(errorMessages.forbidden);
  }

  // Parse options from querystring
  const options = {
    ...(event.queryStringParameters?.limit && {
      limit: parseInt(event.queryStringParameters?.limit, 10),
    }),
    lastEvaluatedKey: event.queryStringParameters?.lastEvaluatedKey,
  };

  const response = await listSeatingsByRestaurant(restaurantId);

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
});
