import { handler } from '@svc/handlers/http/seatings/cancel';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import {
  generateTestRestaurant,
  generateTestSeating,
} from '@tests/utils/test-data-generator';
import {
  putRestaurant,
  deleteRestaurant,
  getSeating,
  deleteSeating,
  putSeating,
} from '@svc/lib/repos/ross-repo';
import {
  Restaurant,
  RestaurantVisibility,
  Seating,
  SeatingStatus,
} from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'DELETE';
const API_PATH_TEMPLATE =
  '/restaurants/{restaurantId}/seatings/{seatingId}/cancel';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'cancelSeatingTest',
});

describe('`DELETE /restaurants/{restaurantId}/seatings/{seatingId}/cancel`', () => {
  let user1Context: AuthenticatedUser;
  let createdRestaurants: Restaurant[] = [];
  let createdSeatings: Seating[] = [];

  const createTestRestaurant = async (prefix: string) => {
    const restaurant = generateTestRestaurant(
      prefix,
      'cancelSeatingTest',
      RestaurantVisibility.PUBLIC,
    );
    await putRestaurant(restaurant);
    createdRestaurants.push(restaurant);
    return restaurant;
  };

  const createTestSeating = async (
    prefix: string,
    restaurantId: string,
    userId: string,
    status: SeatingStatus,
  ) => {
    const seating = generateTestSeating(
      prefix,
      'cancelSeatingTest',
      restaurantId,
      userId,
      status,
    );
    await putSeating(seating);
    createdSeatings.push(seating);
    return seating;
  };

  const deleteTestRestaurants = async () => {
    await Promise.all(
      createdRestaurants.map(async (r) => await deleteRestaurant(r.id)),
    );
    createdRestaurants.length = 0;
  };

  const deleteTestSeatings = async () => {
    await Promise.all(
      createdSeatings.map(
        async (s) => await deleteSeating(s.id, s.restaurantId),
      ),
    );
    createdSeatings.length = 0;
  };

  beforeAll(async () => {
    user1Context = await userManager.createAndSignInUser();
  });

  afterAll(async () => {
    await Promise.all([
      userManager.dispose(),
      deleteTestRestaurants(),
      deleteTestSeatings(),
    ]);
  });

  it('returns 204 No Content when cancelling a seating currently in status PENDING', async () => {
    // **
    // Arrange
    // **
    const testRestaurant = await createTestRestaurant('r1');
    const testSeating = await createTestSeating(
      's1',
      testRestaurant.id,
      user1Context.user.id,
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
    const testRestaurant = await createTestRestaurant('r2');
    const testSeating = await createTestSeating(
      's2',
      testRestaurant.id,
      user1Context.user.id,
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
    const testRestaurant = await createTestRestaurant('r3');
    const testSeating = await createTestSeating(
      's3',
      testRestaurant.id,
      user1Context.user.id,
      SeatingStatus.CANCELLED,
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
    expect(savedSeating!.status).toEqual(SeatingStatus.CANCELLED);
  });

  it('returns 409 Conflict when cancelling a seating currently in status DECLINED', async () => {
    // **
    // Arrange
    // **
    const initialSeatingStatus = SeatingStatus.DECLINED;
    const testRestaurant = await createTestRestaurant('r4');
    const testSeating = await createTestSeating(
      's4',
      testRestaurant.id,
      user1Context.user.id,
      initialSeatingStatus,
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
    expect(savedSeating!.status).toEqual(initialSeatingStatus);
  });

  it('returns 409 Conflict when cancelling a seating currently in status SEATED', async () => {
    // **
    // Arrange
    // **
    const initialSeatingStatus = SeatingStatus.SEATED;
    const testRestaurant = await createTestRestaurant('r5');
    const testSeating = await createTestSeating(
      's5',
      testRestaurant.id,
      user1Context.user.id,
      initialSeatingStatus,
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
    expect(savedSeating!.status).toEqual(initialSeatingStatus);
  });

  it('returns 409 Conflict when cancelling a seating currently in status CLOSED', async () => {
    // **
    // Arrange
    // **
    const initialSeatingStatus = SeatingStatus.CLOSED;
    const testRestaurant = await createTestRestaurant('r6');
    const testSeating = await createTestSeating(
      's6',
      testRestaurant.id,
      user1Context.user.id,
      initialSeatingStatus,
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
    expect(savedSeating!.status).toEqual(initialSeatingStatus);
  });

  it('returns 403 Forbidden when attempting cancellation of a seating not associated with the issuing user', async () => {
    // **
    // Arrange
    // **
    const initialSeatingStatus = SeatingStatus.PENDING;
    const testRestaurant = await createTestRestaurant('r7');
    const testSeating = await createTestSeating(
      's7',
      testRestaurant.id,
      user1Context.user.id,
      initialSeatingStatus,
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
    expect(savedSeating!.status).toEqual(initialSeatingStatus);
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
