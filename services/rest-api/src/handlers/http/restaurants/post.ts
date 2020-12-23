import log from '@dazn/lambda-powertools-logger';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `{event.requestContext?.http?.method?.toUpperCase()} /restaurants called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);

  // Parse body
  const { name, description, region } = JSON.parse(event.body!);

  // TOOD: Persist

  /*
- I can create a new Restaurant, setting a name, description and a region from a preconfigured list of supported regions.
- I can mark restaurants that I own as publicly available.
- I can upload a profile photo for restaurants that I own
  */

  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
};
