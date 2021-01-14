import { handler } from '@svc/handlers/http/restaurants/get';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { generateTestRestaurant } from '@tests/utils/test-data-generator';
import { putRestaurant, deleteRestaurant } from '@svc/lib/repos/ross-repo';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler: handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'getRestaurantAsCustomerTest',
});

describe('`GET /restaurants/{id}` as customer', () => {
  let user1Context: AuthenticatedUser;
  let createdRestaurants: Restaurant[] = [];

  const createTestRestaurant = async (
    prefix: string,
    visibility: RestaurantVisibility,
  ) => {
    const restaurant = generateTestRestaurant(
      prefix,
      'getRestaurantAsCustomerTest',
      visibility,
    );
    await putRestaurant(restaurant);
    createdRestaurants.push(restaurant);
    return restaurant;
  };

  const deleteTestRestaurants = async () => {
    await Promise.all(
      createdRestaurants.map(async (r) => await deleteRestaurant(r.id)),
    );
    createdRestaurants.length = 0;
  };

  beforeAll(async () => {
    user1Context = await userManager.createAndSignInUser();
  });

  it('returns 200 OK when requesting a valid and PUBLIC restaurant id', async () => {
    // **
    // Arrange
    // **
    const testRestaurant = await createTestRestaurant(
      'r1',
      RestaurantVisibility.PUBLIC,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: testRestaurant.id },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);

    // Get new restaurant from response body and verify
    const savedRestaurant = response.body as Restaurant;
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.name).toEqual(testRestaurant.name);
    expect(savedRestaurant!.description).toEqual(testRestaurant.description);
    expect(savedRestaurant!.region).toEqual(testRestaurant.region);
    expect(savedRestaurant!.managerId).toEqual(testRestaurant.managerId);
    expect(savedRestaurant!.visibility).toEqual(RestaurantVisibility.PUBLIC);
  });

  it('returns 404 Not Found if restaurant visibility is not PUBLIC', async () => {
    // **
    // Arrange
    // **
    const testRestaurant = await createTestRestaurant(
      'r2',
      RestaurantVisibility.PRIVATE,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: testRestaurant.id },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(404);
  });

  it('returns 404 Not Found if restaurant id does not exist', async () => {
    // **
    // Arrange
    // **
    // No setup required

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'someId' },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(404);
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}',
        httpMethod: 'GET',
        pathParameters: { id: 'someId' },
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });
});
