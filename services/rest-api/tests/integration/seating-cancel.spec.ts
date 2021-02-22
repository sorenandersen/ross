import { handler } from '@svc/handlers/http/seatings/cancel';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { TestRestaurantManager } from '@tests/utils/test-restaurant-manager';
import { getSeating } from '@svc/lib/repos/ross-repo';
import { Restaurant, SeatingStatus } from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'DELETE';
const API_PATH_TEMPLATE =
  '/restaurants/{restaurantId}/seatings/{seatingId}/cancel';
const TEST_DATA_PREFIX = 'cancelSeatingTest';

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

describe('`DELETE /restaurants/{restaurantId}/seatings/{seatingId}/cancel`', () => {
  let user1Context: AuthenticatedUser;
  let manager1Context: AuthenticatedUser;
  let testRestaurant: Restaurant;

  beforeAll(async () => {
    user1Context = await userManager.createAndSignInUser();
    manager1Context = await userManager.createAndSignInUser();

    restaurantManager = new TestRestaurantManager({
      userManager,
      namePrefix: TEST_DATA_PREFIX,
    });

    // Create test restaurant
    const {
      restaurant: r1,
      managerContext: r1managerContext,
    } = await restaurantManager.createRestaurant(manager1Context, 'r1');

    testRestaurant = r1;
    manager1Context = r1managerContext;
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), restaurantManager.dispose()]);
  });

  it('returns 204 No Content when cancelling a seating currently in status PENDING', async () => {
    // **
    // Arrange
    // **
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's1',
      SeatingStatus.PENDING,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(204);

    // Get seating from DB and verify that status has been updated to CANCELLED
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(SeatingStatus.CANCELLED);
  });

  it('returns 204 No Content when cancelling a seating currently in status ACCEPTED', async () => {
    // **
    // Arrange
    // **
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's2',
      SeatingStatus.ACCEPTED,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(204);

    // Get seating from DB and verify that status has been updated to CANCELLED
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(SeatingStatus.CANCELLED);
  });

  it('returns 204 No Content when cancelling a seating currently in status CANCELLED', async () => {
    // **
    // Arrange
    // **
    const initialAndExpectedStatus = SeatingStatus.CANCELLED;
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's3',
      initialAndExpectedStatus,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(204);

    // Get seating from DB and verify that status is CANCELLED
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(initialAndExpectedStatus);
  });

  it('returns 409 Conflict when cancelling a seating currently in status DECLINED', async () => {
    // **
    // Arrange
    // **
    const initialAndExpectedStatus = SeatingStatus.DECLINED;
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's4',
      initialAndExpectedStatus,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(409);

    // Get seating from DB and verify that status has not changed
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(initialAndExpectedStatus);
  });

  it('returns 409 Conflict when cancelling a seating currently in status SEATED', async () => {
    // **
    // Arrange
    // **
    const initialAndExpectedStatus = SeatingStatus.SEATED;
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's5',
      initialAndExpectedStatus,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(409);

    // Get seating from DB and verify that status has not changed
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(initialAndExpectedStatus);
  });

  it('returns 409 Conflict when cancelling a seating currently in status CLOSED', async () => {
    // **
    // Arrange
    // **
    const initialAndExpectedStatus = SeatingStatus.CLOSED;
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's6',
      initialAndExpectedStatus,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(409);

    // Get seating from DB and verify that status has not changed
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(initialAndExpectedStatus);
  });

  it('returns 403 Forbidden when attempting cancellation of a seating not associated with the issuing user', async () => {
    // **
    // Arrange
    // **
    const initialAndExpectedStatus = SeatingStatus.PENDING;
    const testSeating = await restaurantManager.createSeating(
      testRestaurant.id,
      user1Context.user.id,
      's7',
      initialAndExpectedStatus,
    );

    const user2Context = await userManager.createAndSignInUser();

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: testRestaurant.id,
          seatingId: testSeating.id,
        },
      },
      userContext: user2Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(403);

    // Get seating from DB and verify that status has not changed
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(initialAndExpectedStatus);
  });

  it('returns 404 Not Found when attempting cancellation of a seating that does not exist', async () => {
    // **
    // Arrange
    // **
    // Deliberately not creating test data ...

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {
          restaurantId: 'foo',
          seatingId: 'bar',
        },
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
        pathParameters: {
          restaurantId: 'foo',
          seatingId: 'bar',
        },
      },
    });
    expect(response.statusCode).toEqual(401);
  });
});
