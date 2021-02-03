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

const HTTP_METHOD = 'DELETE';
const API_PATH_TEMPLATE =
  '/restaurants/{restaurantId}/seatings/{seatingId}/cancel';

describe(`'${HTTP_METHOD} ${API_PATH_TEMPLATE}'`, () => {
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

    // Get seating from DB and verify that status is indeed updated
    const savedSeating = await getSeating(testSeating.id, testRestaurant.id);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.status).toEqual(SeatingStatus.CANCELLED);
  });

  it.todo(
    'returns 204 No Content when cancelling a seating currently in status ACCEPTED',
  );

  it.todo(
    'returns 204 No Content when cancelling a seating currently in status CANCELLED',
  );

  it.todo(
    'returns 409 Conflict when cancelling a seating currently in status DECLINED',
  );

  it.todo(
    'returns 409 Conflict when cancelling a seating currently in status SEATED',
  );

  it.todo(
    'returns 409 Conflict when cancelling a seating currently in status CLOSED',
  );

  it.todo(
    'returns 404 Not Found when attempting cancellation of a seating that does not exist',
  );

  it.todo(
    'returns 403 Forbidden when attempting cancellation of a seating not associated with the issuing user',
  );

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
