import { handler as postHandler } from '@svc/handlers/http/restaurants/post';
import { handler as getHandler } from '@svc/handlers/http/restaurants/get';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import { TestUserManager } from '@tests/utils/test-user-manager';
import { deleteRestaurant } from '@svc/lib/repos/ross-repo';
import { Region, Restaurant, UserRole } from '@svc/lib/types/ross-types';
import { InvocationMode } from '@tests/utils/handler-invokers/types';

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

  it('creates a new Restaurant but subsequent GET returns 403 if user does not refresh Cognito token', async () => {
    const manager1Context = await userManager.createAndSignInUser();

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
    let manager2Context = await userManager.createAndSignInUser();

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
      userContext: manager2Context,
    });

    // Grab ID of created restaurant and store it so that we can later delete test restarants
    const testRestaurantId = postResponse.body.id;
    createdRestaurantIds.push(testRestaurantId);

    // Verify POST response
    expect(postResponse.statusCode).toEqual(201);
    expect(postResponse.headers.location).toEqual(
      `/restaurants/${testRestaurantId}`,
    );

    // HACK: In integration (LOCAL_HANDLER) mode manually update users restuarant assiciation fields.
    //  In e2e mode the user context is provided by the cognitoJwtAuthorizer, and thus the fields are already populated from the JWT claims.
    if (postApiInvoker.invocationMode === InvocationMode.LOCAL_HANDLER) {
      manager2Context.user.restaurantId = testRestaurantId;
      manager2Context.user.restaurantRole = UserRole.MANAGER;
    }

    // **
    // ** Step 2: Refresh users Cognito token
    // **
    manager2Context = await userManager.refreshUserToken(manager2Context);

    // **
    // ** Step 3: GET new restaurant from API
    // **
    const getResponse = await getApiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: testRestaurantId },
      },
      userContext: manager2Context,
    });

    // Verify GET response
    expect(getResponse.statusCode).toEqual(200);

    // Get new restaurant from response body and verify
    const savedRestaurant = getResponse.body as Restaurant;
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.name).toEqual(testRestaurant.name);
    expect(savedRestaurant!.managerId).toEqual(manager2Context.user.id);
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