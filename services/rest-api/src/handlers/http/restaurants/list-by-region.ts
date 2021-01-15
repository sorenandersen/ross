import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import { listRestaurantsByVisibilityAndRegion } from '@svc/lib/repos/ross-repo';
import { Region, RestaurantVisibility } from '@svc/lib/types/ross-types';

/**
 * Gets list of restaurants in the specified region
 */
export const handler = wrap(async (event) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/region/${
      event.pathParameters?.region
    } called`,
    { event },
  );

  // Parse options from querystring
  const region = event.pathParameters?.region?.toUpperCase() as Region;
  if (!Region[region]) {
    throw new createError.BadRequest('Invalid region provided');
  }

  const options = {
    ...(event.queryStringParameters?.limit && {
      limit: parseInt(event.queryStringParameters?.limit, 10),
    }),
    lastEvaluatedKey: event.queryStringParameters?.lastEvaluatedKey,
  };

  const response = await listRestaurantsByVisibilityAndRegion(
    RestaurantVisibility.PUBLIC,
    region,
    options,
  );

  return {
    statusCode: 200,
    body: JSON.stringify(response),
  };
});
