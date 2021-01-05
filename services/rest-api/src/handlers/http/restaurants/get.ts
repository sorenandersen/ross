import log from '@dazn/lambda-powertools-logger';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { getRestaurant } from '@svc/lib/repos/ross-repo';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/${
      event.pathParameters?.id
    } called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const restaurantId = event.pathParameters?.id!;

  // TODO validate user.restaurantRole as well? Should both MANAGER and STAFF be allowed to access?
  // **
  // **
  // **

  if (user.restaurantId !== restaurantId) {
    return {
      statusCode: 403,
      body: JSON.stringify({}),
    };
  }

  const restaurant = getRestaurant(restaurantId);

  return {
    statusCode: 200,
    body: JSON.stringify({ ...restaurant }),
  };
};
