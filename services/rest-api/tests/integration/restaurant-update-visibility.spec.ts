import { handler } from '@svc/handlers/http/restaurants/update-visibility';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { TestRestaurantManager } from '@tests/utils/test-restaurant-manager';
import { getRestaurant } from '@svc/lib/repos/ross-repo';
import { RestaurantVisibility } from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'PATCH';
const API_PATH_TEMPLATE = '/restaurants/{id}/visibility';
const TEST_DATA_PREFIX = 'updateRestaurantVisibilityTest';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: TEST_DATA_PREFIX,
});
let restaurantManager: TestRestaurantManager;

describe('`PATCH /restaurants/{id}/visibility`', () => {
  let manager1Context: AuthenticatedUser;

  beforeAll(async () => {
    manager1Context = await userManager.createAndSignInUser();

    restaurantManager = new TestRestaurantManager({
      userManager,
      namePrefix: TEST_DATA_PREFIX,
    });
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), restaurantManager.dispose()]);
  });

  it('returns 204 No Content when a valid visibility is provided', async () => {
    // **
    // Arrange
    // **
    const {
      restaurant: testRestaurant,
      managerContext: testRestaurantManagerContext,
    } = await restaurantManager.createRestaurant(
      manager1Context,
      'r1',
      RestaurantVisibility.PRIVATE,
    );
    const newVisibility = RestaurantVisibility.PUBLIC;

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: testRestaurantManagerContext,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(204);

    // Get restaurant from DB and verify that visibility is indeed updated
    const savedRestaurant = await getRestaurant(testRestaurant.id);
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.visibility).toEqual(newVisibility);
  });

  it('returns 400 Bad Request when an invalid visibility is provided', async () => {
    // **
    // Arrange
    // **
    const {
      restaurant: testRestaurant,
      managerContext: testRestaurantManagerContext,
    } = await restaurantManager.createRestaurant(
      manager1Context,
      'r2',
      RestaurantVisibility.PRIVATE,
    );
    const newVisibility = 'INVALID_VALUE';

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: testRestaurantManagerContext,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(400);

    // Get restaurant from DB and verify that visibility has not changed
    const savedRestaurant = await getRestaurant(testRestaurant.id);
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.visibility).toEqual(testRestaurant.visibility);
  });

  it('returns 403 Forbidden when attempting update a restaurant not associated with the issuing user', async () => {
    // **
    // Arrange
    // **
    const {
      restaurant: testRestaurant,
    } = await restaurantManager.createRestaurant(
      manager1Context,
      'r3',
      RestaurantVisibility.PRIVATE,
    );
    const newVisibility = RestaurantVisibility.PUBLIC;

    // Create another user context to use for issuing the update
    // Purpose of this test is to verify that an update cannot take place
    // when the issuing user is not associated with the restaurant in question.
    const manager2Context = await userManager.createAndSignInUser();

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: manager2Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(403);

    // Get restaurant from DB and verify that visibility has not changed
    const savedRestaurant = await getRestaurant(testRestaurant.id);
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.visibility).toEqual(testRestaurant.visibility);
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
