import { handler } from '@svc/handlers/http/seatings/create';
import { apiGatewayConfig, AWS_REGION, cognitoConfig } from '@svc/config';
import { ApiGatewayHandlerInvoker } from '@tests/utils/handler-invokers/api-gateway-handler-invoker';
import {
  AuthenticatedUser,
  TestUserManager,
} from '@tests/utils/test-user-manager';
import { getSeating, deleteSeating } from '@svc/lib/repos/ross-repo';
import { Seating, SeatingStatus } from '@svc/lib/types/ross-types';

const apiInvoker = new ApiGatewayHandlerInvoker({
  baseUrl: apiGatewayConfig.getBaseUrl(),
  handler,
});

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'createSeatingTest',
});

const apiPathTemplate = '/restaurants/{restaurantId}/seatings';

interface TestSeating {
  seatingTime: string;
  numSeats: number;
  notes: string;
}

describe('`POST /restaurants/{restaurantId}/seatings`', () => {
  let user1Context: AuthenticatedUser;
  let createdSeatingIds: string[] = [];
  const testRestaurantId = `id-createSeatingTest`;

  const createTestSeating = (prefix: string) => {
    const seating: TestSeating = {
      seatingTime: new Date().toISOString(),
      numSeats: 2,
      notes: `notes-${prefix}-createSeatingTest`,
    };
    return seating;
  };

  const deleteTestSeatings = async () => {
    await Promise.all(
      createdSeatingIds.map(
        async (id) => await deleteSeating(id, testRestaurantId),
      ),
    );
    createdSeatingIds.length = 0;
  };

  beforeAll(async () => {
    user1Context = await userManager.createAndSignInUser();
  });

  it('creates a new Seating in DDB whenever required fields are provided', async () => {
    const testSeating = createTestSeating('s1');
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: apiPathTemplate,
        httpMethod: 'POST',
        pathParameters: { restaurantId: testRestaurantId },
        body: { ...testSeating },
      },
      userContext: user1Context,
    });

    expect(response.statusCode).toEqual(201);

    // Grab ID of created restaurant and store it so that we can later delete created test restarants
    const testSeatingId = response.body.id;
    createdSeatingIds.push(testSeatingId);

    // Verify response headers
    expect(response.headers.location).toEqual(
      `/restaurants/${testRestaurantId}/seatings/${testSeatingId}`,
    );

    // Get new restaurant from DB and verify that it's created with expected values
    const savedSeating = await getSeating(testSeatingId, testRestaurantId);
    expect(savedSeating).toBeTruthy();
    expect(savedSeating!.restaurantId).toEqual(testRestaurantId);
    expect(savedSeating!.userId).toEqual(user1Context.user.id);
    expect(savedSeating!.status).toEqual(SeatingStatus.PENDING);
    expect(savedSeating!.seatingTime).toEqual(testSeating.seatingTime);
    expect(savedSeating!.numSeats).toEqual(testSeating.numSeats);
    expect(savedSeating!.notes).toEqual(testSeating.notes);
  });

  it('returns 400 Bad Request when invalid seating payload is provided (1)', async () => {
    const testSeating = createTestSeating('s2');
    testSeating.seatingTime = 'invalid-date-time-value';

    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: apiPathTemplate,
        httpMethod: 'POST',
        pathParameters: { restaurantId: testRestaurantId },
        body: { ...testSeating },
      },
      userContext: user1Context,
    });

    expect(response.statusCode).toEqual(400);
    expect(response.body.message).toContain('seatingTime');
  });

  it('returns 400 Bad Request when invalid seating payload is provided (2)', async () => {
    const testSeating = createTestSeating('s3');
    const testSeating2 = Object.assign(
      {},
      { ...testSeating, numSeats: 'invalid-numSeats-data-type' },
    );

    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: apiPathTemplate,
        httpMethod: 'POST',
        pathParameters: { restaurantId: testRestaurantId },
        body: { ...testSeating2 },
      },
      userContext: user1Context,
    });

    expect(response.statusCode).toEqual(400);
    expect(response.body.message).toContain('numSeats');
  });

  it('returns 400 Bad Request when invalid seating payload is provided (3)', async () => {
    const testSeating = createTestSeating('s4');
    testSeating.seatingTime = '2021-12-31T20:00:0';
    testSeating.numSeats = 0;

    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: apiPathTemplate,
        httpMethod: 'POST',
        pathParameters: { restaurantId: testRestaurantId },
        body: { ...testSeating },
      },
      userContext: user1Context,
    });

    expect(response.statusCode).toEqual(400);
    expect(response.body.message).toContain('seatingTime');
    expect(response.body.message).toContain('numSeats');
  });

  // E2E test: APIGW authorizer configuration
  it('returns 401 Unauthorized error if no auth token provided [e2e]', async () => {
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: apiPathTemplate,
        httpMethod: 'POST',
        pathParameters: { restaurantId: testRestaurantId },
      },
    });
    expect(response.statusCode).toEqual(401);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteTestSeatings()]);
  });
});
