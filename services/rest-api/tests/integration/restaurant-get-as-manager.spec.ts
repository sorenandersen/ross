import { handler as postHandler } from '@svc/handlers/http/restaurants/post';
import { handler as getHandler } from '@svc/handlers/http/restaurants/get';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { deleteRestaurant } from '@svc/lib/repos/ross-repo';
import { Region, Restaurant } from '@svc/lib/types/ross-types';

const postApiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler: postHandler,
});

const getApiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler: getHandler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'getRestaurantAsManagerTest',
});

interface TestRestaurant {
  name: string;
  description: string;
  region: Region;
}

describe('`GET /restaurants/{id}`', () => {
  let manager1Context: AuthenticatedUser;
  let createdRestaurantIds: string[] = [];

  const createTestRestaurant = (prefix: string) => {
    const restaurant: TestRestaurant = {
      name: `name-${prefix}-getRestaurantAsManagerTest`,
      description: `description-${prefix}-getRestaurantAsManagerTest`,
      region: Region.NOT_SPECIFIED,
    };
    return restaurant;
  };

  const deleteTestRestaurants = async () => {
    await Promise.all(
      createdRestaurantIds.map(async (id) => await deleteRestaurant(id)),
    );
    createdRestaurantIds = [];
  };

  beforeAll(async () => {
    manager1Context = await userManager.createAndSignInUser();
  });

  it('creates a new Restaurant but subsequent GET returns 403 if user does not refresh Cognito token', async () => {
    // **
    // ** Step 1: Create restaurant
    // **
    const testRestaurant = createTestRestaurant('r1');
    const postResponse = await postApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants',
        httpMethod: 'POST',
        pathParameters: {},
        body: { ...testRestaurant },
      },
      userContext: manager1Context,
    });

    // Grab ID of created restaurant and store it so that we can later delete test restarants
    const testRestaurantId = postResponse.body.id;
    createdRestaurantIds.push(testRestaurantId);

    // Verify POST response
    expect(postResponse.statusCode).toEqual(201);
    expect(postResponse.headers.location).toEqual(
      `/restaurants/${testRestaurantId}`,
    );

    // **
    // ** Step 2: GET new restaurant from API
    // **
    const getResponse = await getApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: testRestaurantId },
      },
      userContext: manager1Context,
    });

    // Verify GET response
    expect(getResponse.statusCode).toEqual(403);
  });

  it('creates a new Restaurant, refreshes users Cognito token and subsequent GET returns the restaurant', async () => {
    // **
    // ** Step 1: Create restaurant
    // **
    const testRestaurant = createTestRestaurant('r2');
    const postResponse = await postApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants',
        httpMethod: 'POST',
        pathParameters: {},
        body: { ...testRestaurant },
      },
      userContext: manager1Context,
    });

    // Grab ID of created restaurant and store it so that we can later delete test restarants
    const testRestaurantId = postResponse.body.id;
    createdRestaurantIds.push(testRestaurantId);

    // Verify POST response
    expect(postResponse.statusCode).toEqual(201);
    expect(postResponse.headers.location).toEqual(
      `/restaurants/${testRestaurantId}`,
    );

    // **
    // ** Step 2: Refresh users Cognito token
    // **
    // TODO

    // **
    // ** Step 3: GET new restaurant from API
    // **
    const getResponse = await getApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: testRestaurantId },
      },
      userContext: manager1Context,
    });

    // Verify GET response
    expect(getResponse.statusCode).toEqual(200);

    // Get new restaurant response body and verify
    const savedRestaurant = JSON.parse(getResponse.body) as Restaurant;
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.name).toEqual(testRestaurant.name);
    expect(savedRestaurant!.managerId).toEqual(manager1Context.user.id);
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await getApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'anything' },
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });
});
