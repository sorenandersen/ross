import { handler } from '@svc/handlers/http/restaurants/update-visibility';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import { InvocationMode } from '@tests/utils/handler-invokers/types';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { assignRestaurantToUser } from '@svc/lib/auth/cognito-util';
import {
  getRestaurant,
  putRestaurant,
  deleteRestaurant,
} from '@svc/lib/repos/ross-repo';
import {
  Region,
  Restaurant,
  RestaurantApprovalStatus,
  RestaurantVisibility,
  UserRole,
} from '@svc/lib/types/ross-types';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'updateRestaurantVisibilityTest',
});

describe.only('`POST /restaurants`', () => {
  let manager1Context: AuthenticatedUser;
  let createdRestaurants: Restaurant[] = [];

  const createTestRestaurant = async (prefix: string) => {
    return createTestRestaurantWithManagerId(prefix, manager1Context.user.id);
  };

  const createTestRestaurantWithManagerId = async (
    prefix: string,
    managerId: string,
  ) => {
    const restaurant: Restaurant = {
      id: `id-${prefix}-updateRestaurantVisibilityTest`,
      name: `name-${prefix}-updateRestaurantVisibilityTest`,
      description: `description-${prefix}-updateRestaurantVisibilityTest`,
      visibility: RestaurantVisibility.PRIVATE,
      region: Region.NOT_SPECIFIED,
      createdAt: new Date().toISOString(),
      managerId,
      approvalStatus: RestaurantApprovalStatus.APPROVED,
    };
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
    manager1Context = await userManager.createAndSignInUser();
  });

  it('returns 204 No Content when a valid visibility is provided', async () => {
    // **
    // Arrange
    // **
    const testRestaurant = await createTestRestaurant('r1');
    const newVisibility = RestaurantVisibility.PUBLIC;

    // Update Cognito user to be a manager of the new restaurant
    await assignRestaurantToUser(
      manager1Context.user.id,
      testRestaurant.id,
      UserRole.MANAGER,
    );

    // Update test user context to reflect new restaurant assignment
    if (apiInvoker.invocationMode === InvocationMode.LOCAL_HANDLER) {
      manager1Context.user.restaurantId = testRestaurant.id;
      manager1Context.user.restaurantRole = UserRole.MANAGER;
    } else {
      // In e2e mode the user context is provided from JWT claims (cognitoJwtAuthorizer)
      // in which case the users token must be refreshed after a restaurant assignment
      manager1Context = await userManager.refreshUserToken(manager1Context);
    }

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}/visibility',
        httpMethod: 'PATCH',
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: manager1Context,
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
    const testRestaurant = await createTestRestaurant('r2');
    const newVisibility = 'INVALID_VALUE';

    // Update Cognito user to be a manager of the new restaurant
    await assignRestaurantToUser(
      manager1Context.user.id,
      testRestaurant.id,
      UserRole.MANAGER,
    );

    // Update test user context to reflect new restaurant assignment
    if (apiInvoker.invocationMode === InvocationMode.LOCAL_HANDLER) {
      manager1Context.user.restaurantId = testRestaurant.id;
      manager1Context.user.restaurantRole = UserRole.MANAGER;
    } else {
      // In e2e mode the user context is provided from JWT claims (cognitoJwtAuthorizer)
      // in which case the users token must be refreshed after a restaurant assignment
      manager1Context = await userManager.refreshUserToken(manager1Context);
    }

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}/visibility',
        httpMethod: 'PATCH',
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: manager1Context,
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
    let testRestaurant = await createTestRestaurantWithManagerId(
      'r3',
      'another-manager-id',
    );
    const newVisibility = RestaurantVisibility.PUBLIC;

    // NOTE: Deliberately omit assigning test restaurant to the user
    // Purpose of this test is to verify that an update cannot take place
    // when the issuing user is not associated with the restaurant in question.

    // **
    // Act
    // **
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}/visibility',
        httpMethod: 'PATCH',
        pathParameters: { id: testRestaurant.id },
        body: { visibility: newVisibility },
      },
      userContext: manager1Context,
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
        pathTemplate: '/restaurants/{id}/visibility',
        httpMethod: 'PATCH',
        pathParameters: { id: 'soneId' },
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestRestaurants()]);
  });
});
