import { handler } from '@svc/handlers/http/me/get';
import { User } from '@svc/lib/types/ross-types';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import { TestUserManager } from '@tests/utils/test-user-manager';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolStaffClientId: cognitoConfig.userPoolStaffClientId,
  region: AWS_REGION,
  usernamePrefix: 'get-me-test',
});

describe('`GET /me`', () => {
  it('returns user profile fields for logged in users', async () => {
    const userContext = await userManager.createAndSignInUser();
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/me',
        httpMethod: 'GET',
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
        pathTemplate: '/me',
        httpMethod: 'GET',
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await userManager.dispose();
  });
});
