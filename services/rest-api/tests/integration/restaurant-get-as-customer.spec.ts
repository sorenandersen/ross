import { handler } from '@svc/handlers/http/restaurants/get';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { TestRestaurantManager } from '@tests/utils/test-restaurant-manager';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'GET';
const API_PATH_TEMPLATE = '/restaurants/{id}';
const TEST_DATA_PREFIX = 'getRestaurantAsCustomerTest';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler: handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: TEST_DATA_PREFIX,
});
let restaurantManager: TestRestaurantManager;

describe('`GET /restaurants/{id}` as customer', () => {
  let manager1Context: AuthenticatedUser;
  let user1Context: AuthenticatedUser;

  beforeAll(async () => {
    manager1Context = await userManager.createAndSignInUser();
    user1Context = await userManager.createAndSignInUser();

    restaurantManager = new TestRestaurantManager({
      userManager,
      namePrefix: TEST_DATA_PREFIX,
    });
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), restaurantManager.dispose()]);
  });

  it('returns 200 OK when requesting a valid and PUBLIC restaurant id', async () => {
    // **
    // Arrange
    // **
    const {
      restaurant: testRestaurant,
    } = await restaurantManager.createRestaurant(manager1Context, 'r1');

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
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
    const {
      restaurant: testRestaurant,
    } = await restaurantManager.createRestaurant(
      manager1Context,
      'r2',
      RestaurantVisibility.PRIVATE,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
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
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
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
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { id: 'someId' },
      },
    });
    expect(response.statusCode).toEqual(401);
  });
});
