import { handler } from '@svc/handlers/http/restaurants/create';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { getRestaurant, deleteRestaurant } from '@svc/lib/repos/ross-repo';
import { Region, RestaurantVisibility } from '@svc/lib/types/ross-types';

const HTTP_METHOD = 'POST';
const API_PATH_TEMPLATE = '/restaurants';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'createRestaurantTest',
});

interface TestRestaurant {
  name: string;
  description: string;
  region: Region;
}

describe('`POST /restaurants`', () => {
  let manager1Context: AuthenticatedUser;
  let createdRestaurantIds: string[] = [];

  const createTestRestaurant = (prefix: string) => {
    const restaurant: TestRestaurant = {
      name: `name-${prefix}-createRestaurantTest`,
      description: `description-${prefix}-createRestaurantTest`,
      region: Region.NOT_SPECIFIED,
    };
    return restaurant;
  };

  const deleteTestRestaurants = async () => {
    await Promise.all(
      createdRestaurantIds.map(async (id) => await deleteRestaurant(id)),
    );
    createdRestaurantIds.length = 0;
  };

  beforeAll(async () => {
    manager1Context = await userManager.createAndSignInUser();
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });

  it('creates a new Restaurant in DDB whenever required fields are provided', async () => {
    const testRestaurant = createTestRestaurant('r1');
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
        pathParameters: {},
        body: { ...testRestaurant },
      },
      userContext: manager1Context,
    });

    // Grab ID of created restaurant and store it so that we can later delete created test restarants
    const testRestaurantId = response.body.id;
    createdRestaurantIds.push(testRestaurantId);

    // Verify response
    expect(response.statusCode).toEqual(201);
    expect(response.headers.location).toEqual(
      `/restaurants/${testRestaurantId}`,
    );

    // Get new restaurant from DB and verify that it's created with expected values
    const savedRestaurant = await getRestaurant(testRestaurantId);
    expect(savedRestaurant).toBeTruthy();
    expect(savedRestaurant!.name).toEqual(testRestaurant.name);
    expect(savedRestaurant!.description).toEqual(testRestaurant.description);
    expect(savedRestaurant!.region).toEqual(testRestaurant.region);
    expect(savedRestaurant!.managerId).toEqual(manager1Context.user.id);
    expect(savedRestaurant!.visibility).toEqual(RestaurantVisibility.PRIVATE);
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: API_PATH_TEMPLATE,
        httpMethod: HTTP_METHOD,
      },
    });
    expect(response.statusCode).toEqual(401);
  });
});
