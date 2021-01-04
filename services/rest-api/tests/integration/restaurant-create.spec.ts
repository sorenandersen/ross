import { handler } from '@svc/handlers/http/restaurants/post';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { getRestaurant, deleteRestaurant } from '@svc/lib/repos/ross-repo';
import { RestaurantAvailability, Region } from '@svc/lib/types/ross-types';

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
    createdRestaurantIds = [];
  };

  beforeAll(async () => {
    manager1Context = await userManager.createAndSignInUser();
  });

  it('creates a new Restaurant in DDB whenever required fields are provided', async () => {
    const testRestaurant = createTestRestaurant('r1');
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants',
        httpMethod: 'POST',
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
    expect(savedRestaurant!.availability).toEqual(
      RestaurantAvailability.PRIVATE,
    );
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants',
        httpMethod: 'POST',
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });
});
