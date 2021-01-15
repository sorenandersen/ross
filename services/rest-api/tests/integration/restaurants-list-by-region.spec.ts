import _ from 'lodash';
import { handler } from '@svc/handlers/http/restaurants/list-by-region';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { generateTestRestaurant } from '@tests/utils/test-data-generator';
import { putRestaurant, deleteRestaurant } from '@svc/lib/repos/ross-repo';
import {
  PagedList,
  Region,
  Restaurant,
  RestaurantVisibility,
} from '@svc/lib/types/ross-types';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler: handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'listRestaurantsByRegionTest',
});

describe('`GET /restaurants/region/{region}`', () => {
  let user1Context: AuthenticatedUser;
  let createdRestaurants: Restaurant[] = [];

  const createTestRestaurant = async (
    prefix: string,
    visibility: RestaurantVisibility,
    region: Region,
  ) => {
    const restaurant = generateTestRestaurant(
      prefix,
      'listRestaurantsByRegionTest',
      visibility,
      region,
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

  beforeEach(async () => {
    await deleteTestRestaurants();
  });

  it('only returns restaurants within the specified region', async () => {
    // **
    // Arrange
    // **
    await createTestRestaurant('r1', RestaurantVisibility.PUBLIC, Region.FOO);
    await createTestRestaurant('r2', RestaurantVisibility.PUBLIC, Region.FOO);
    await createTestRestaurant('r3', RestaurantVisibility.PUBLIC, Region.BAR);
    await createTestRestaurant('r4', RestaurantVisibility.PUBLIC, Region.BAR);

    // **
    // Act
    // **
    const requestedRegion = Region.FOO;
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/region/{region}',
        httpMethod: 'GET',
        pathParameters: { region: requestedRegion },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(
      createdRestaurants.filter((r) => r.region === requestedRegion).length,
    );
  });

  it('returns restaurants within the specified region, with case-insensitive handling of the provided region name', async () => {
    // **
    // Arrange
    // **
    await createTestRestaurant('r8', RestaurantVisibility.PUBLIC, Region.FOO);

    // **
    // Act, now with a mixed case region name
    // **
    const requestedRegion = Region.FOO;
    const requestedRegionQueryStringParam = 'Foo';
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/region/{region}',
        httpMethod: 'GET',
        pathParameters: { region: requestedRegionQueryStringParam },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(
      createdRestaurants.filter((r) => r.region === requestedRegion).length,
    );
  });

  it('only returns restaurants with visibility=PUBLIC', async () => {
    // **
    // Arrange
    // **
    await createTestRestaurant('r11', RestaurantVisibility.PUBLIC, Region.FOO);
    await createTestRestaurant('r12', RestaurantVisibility.PUBLIC, Region.FOO);
    await createTestRestaurant('r13', RestaurantVisibility.PRIVATE, Region.FOO);
    await createTestRestaurant('r14', RestaurantVisibility.PRIVATE, Region.FOO);

    // **
    // Act
    // **
    const requestedRegion = Region.FOO;
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/region/{region}',
        httpMethod: 'GET',
        pathParameters: { region: requestedRegion },
      },
      userContext: user1Context,
    });

    // **
    // Assert
    // **
    expect(response.statusCode).toEqual(200);
    const result = response.body as PagedList<Restaurant>;
    expect(result.items.length).toEqual(
      createdRestaurants.filter(
        (r) => r.visibility === RestaurantVisibility.PUBLIC,
      ).length,
    );
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
        pathTemplate: '/restaurants/region/{region}',
        httpMethod: 'GET',
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
        pathTemplate: '/restaurants/region/{region}',
        httpMethod: 'GET',
        pathParameters: { region: Region.FOO },
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });
});
