import _ from 'lodash';
import { handler } from '@svc/handlers/http/restaurants/list-by-region';
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
  RestaurantVisibility,
} from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'GET';
const API_PATH_TEMPLATE = '/restaurants/region/{region}';
const TEST_DATA_PREFIX = 'listRestaurantsByRegionTest';

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

describe('`GET /restaurants/region/{region}`', () => {
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

  beforeEach(async () => {
    await restaurantManager.dispose();
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), restaurantManager.dispose()]);
  });

  it('only returns restaurants within the specified region', async () => {
    // **
    // Arrange
    // **
    await restaurantManager.createRestaurant(
      manager1Context,
      'r1',
      RestaurantVisibility.PUBLIC,
      Region.FOO,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r2',
      RestaurantVisibility.PUBLIC,
      Region.FOO,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r3',
      RestaurantVisibility.PUBLIC,
      Region.BAR,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r4',
      RestaurantVisibility.PUBLIC,
      Region.BAR,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { region: Region.FOO },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(2);
  });

  it('returns restaurants within the specified region, with case-insensitive handling of the provided region name', async () => {
    // **
    // Arrange
    // **
    await restaurantManager.createRestaurant(
      manager1Context,
      'r8',
      RestaurantVisibility.PUBLIC,
      Region.FOO,
    );

    // **
    // Act, now with a mixed case region name
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { region: 'Foo' },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(1);
  });

  it('only returns restaurants with visibility=PUBLIC', async () => {
    // **
    // Arrange
    // **
    await restaurantManager.createRestaurant(
      manager1Context,
      'r11',
      RestaurantVisibility.PUBLIC,
      Region.FOO,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r12',
      RestaurantVisibility.PUBLIC,
      Region.FOO,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r13',
      RestaurantVisibility.PRIVATE,
      Region.FOO,
    );
    await restaurantManager.createRestaurant(
      manager1Context,
      'r14',
      RestaurantVisibility.PRIVATE,
      Region.FOO,
    );

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { region: Region.FOO },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(2);
  });

  it('returns an empty list when no restaurants exist within the specified region', async () => {
    // **
    // Arrange
    // **
    // Nothing to arrange as deleteTestRestaurants() runs in "beforeEach"

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: { region: Region.FOO },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(0);
  });

  it.todo(
    'restricts amount of returned items and sets `lastEvaluatedKey` field whenever the `limit` query string parameter is supplied',
  );
  it.todo(
    'returns next page of results whenever the `lastEvaluatedKey` query string parameter is supplied',
  );

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
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
