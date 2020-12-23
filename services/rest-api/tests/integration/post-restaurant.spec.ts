import { handler } from '@svc/handlers/http/restaurants/post';
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
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'post-restaurants-test',
});

describe('`POST /restaurants`', () => {
  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants',
        httpMethod: 'POST',
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await userManager.dispose();
  });
});
