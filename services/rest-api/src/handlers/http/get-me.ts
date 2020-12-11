import log from '@dazn/lambda-powertools-logger';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { add } from '@svc/lib/testing-js-to-ts-interop';
import { multiply } from '../../lib/testing-ts-to-js-interop';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug('/me called', { event });
  //const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const user = { name: 'Foo', add: add(5, 5), multiply: multiply(5, 5) };
  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
};
