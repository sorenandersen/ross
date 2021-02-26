import _ from 'lodash';
import { handler } from '@svc/handlers/http/seatings/list-by-restaurant';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { TestRestaurantManager } from '@tests/utils/test-restaurant-manager';
import {
  PagedList,
  Region,
  Restaurant,
  Seating,
  SeatingStatus,
} from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'GET';
const API_PATH_TEMPLATE = '/restaurants/{restaurantId}/seatings';
const TEST_DATA_PREFIX = 'listSeatingsByRestaurantTest';

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

describe('`GET /restaurants/{restaurantId}/seatings`', () => {
  let manager1Context: AuthenticatedUser;
  let testRestaurant: Restaurant;

  beforeAll(async () => {
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

  it('only returns current and upcoming seatings', async () => {
    // **
    // Arrange
    // **
    // Future seating
    const seatingTime1 = new Date();
    seatingTime1.setDate(seatingTime1.getDate() + 7);
    await restaurantManager.createSeating(
      testRestaurant.id,
      'some-user-id',
      's1-1',
      SeatingStatus.PENDING,
    );
    // Past seating
    const seatingTime2 = new Date();
    seatingTime2.setDate(seatingTime2.getDate() - 1);
    await restaurantManager.createSeating(
      testRestaurant.id,
      'some-user-id',
      's1-2',
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
        },
      },
      userContext: manager1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Seating>;
    expect(result.items.length).toEqual(1);
  });

  it.todo('does not return cancelled seatings');

  it.todo(
    'returns an empty list when no seatings exist for the specified restaurant',
  );

  it.todo(
    'restricts amount of returned items and sets `lastEvaluatedKey` field whenever the `limit` query string parameter is supplied',
  );
  it.todo(
    'returns next page of results whenever the `lastEvaluatedKey` query string parameter is supplied',
  );

  // E2E test: APIGW authorizer configuration
  it.skip('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { region: Region.FOO },
      },
    });
    expect(response.statusCode).toEqual(401);
  });
});
