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

interface TestSeating {
  seatingTime: string;
  numSeats: number;
  notes: string;
}

describe('`POST /restaurants`', () => {
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
    const prefix = 's1';
    const testSeating = createTestSeating(prefix);
    const response = await apiInvoker.invoke({
      event: {
        pathTemplate: '/restaurants/{id}/seatings',
        httpMethod: 'POST',
        pathParameters: { id: testRestaurantId },
        body: { ...testSeating },
      },
      userContext: user1Context,
    });

    // Grab ID of created restaurant and store it so that we can later delete created test restarants
    const testSeatingId = response.body.id;
    createdSeatingIds.push(testSeatingId);

    // Verify response
    expect(response.statusCode).toEqual(201);
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

  it.todo('returns 400 Bad Request when invalid seating payload is provided');

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
    await Promise.all([userManager.dispose(), deleteTestSeatings()]);
  });
});
