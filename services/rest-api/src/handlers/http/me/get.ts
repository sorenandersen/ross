import log from '@dazn/lambda-powertools-logger';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug('/me called', { event });
  // TODO revert
  //const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const user = {
    id: 'sub',
    name: 'name',
    email: 'email',
    username: 'cognito:username',
  };
  return {
    statusCode: 200,
    body: JSON.stringify(user),
  };
};
