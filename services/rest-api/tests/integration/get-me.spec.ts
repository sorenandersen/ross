import { handler } from '@svc/handlers/http/me/get';
import { User } from '@svc/lib/types/ross-types';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import { TestUserManager } from '@tests/utils/test-user-manager';

const HTTP_METHOD = 'GET';
const API_PATH_TEMPLATE = '/me';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'get-me-test',
});

describe('`GET /me`', () => {
  afterAll(async () => {
    await userManager.dispose();
  });

  it('returns user profile fields for logged in users', async () => {
    const userContext = await userManager.createAndSignInUser();
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
      },
      userContext,
    });

    expect(response.statusCode).toEqual(200);
    const userProfile = response.body as User;
    expect(userProfile.id).toEqual(userContext.user.id);
    expect(userProfile.email).toEqual(userContext.user.email);
    expect(userProfile.name).toEqual(userContext.user.name);
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
      },
    });
    expect(response.statusCode).toEqual(401);
  });
});
