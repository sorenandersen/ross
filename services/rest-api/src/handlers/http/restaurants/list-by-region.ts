import log from '@dazn/lambda-powertools-logger';
import { listRestaurantsByVisibilityAndRegion } from '@svc/lib/repos/ross-repo';
import { Region, RestaurantVisibility } from '@svc/lib/types/ross-types';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets list of restaurants in the specified region
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/region/${
      event.pathParameters?.region
    } called`,
    { event },
  );

  // Parse options from querystring -- TODO: Handle region parameter case-insensitively, e.g. allowing both "Bronx" and "bronx"
  const region = event.pathParameters?.region as Region;
  if (!Region[region]) {
    // invalid region provided
    return {
      statusCode: 400,
      body: '',
    };
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
};
