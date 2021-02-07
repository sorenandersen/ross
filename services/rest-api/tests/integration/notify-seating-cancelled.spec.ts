import { AWS_REGION, lambdaConfig } from '@svc/config';
import { publishEvent } from '@svc/lib/events/event-publisher';
import { handler } from '@svc/handlers/eventbridge/notify-seating-cancelled';
import { LambdaFunctionHandlerInvoker } from '@tests/utils/handler-invokers/lambda-function-handler-invoker';
import uuid from '@svc/lib/uuid';
import { getEventBridgeEvent } from '@tests/utils/lambda-payload-generator';
import {
  generateTestUser,
  generateTestRestaurant,
} from '@tests/utils/test-data-generator';
import {
  putRestaurant,
  putUser,
  deleteRestaurant,
  deleteUser,
} from '@svc/lib/repos/ross-repo';
import {
  EventDetailType,
  Region,
  Restaurant,
  RestaurantVisibility,
  SeatingStatus,
  SeatingStatusUpdatedEvent,
  User,
} from '@svc/lib/types/ross-types';

const lambdaFunctionName = `${lambdaConfig.functionNamePrefix}ebNotifySeatingCancelled`;
const lambdaInvoker = new LambdaFunctionHandlerInvoker({
  awsRegion: AWS_REGION,
  lambdaFunctionName,
  handler,
});

describe('`ebNotifySeatingCancelled` Lambda function', () => {
  const testSuiteName = 'notifySeatingCancelledTest';
  const testCustomer: User = {
    ...generateTestUser('notifySeatingCancelledTest'),
    id: `id-u1-${testSuiteName}`,
  };
  const testManager: User = {
    ...generateTestUser('notifySeatingCancelledTest'),
    id: `id-u2-${testSuiteName}`,
  };
  const testRestaurant: Restaurant = generateTestRestaurant(
    'r1',
    testSuiteName,
    RestaurantVisibility.PUBLIC,
    Region.NOT_SPECIFIED,
    testManager.id,
  );

  beforeAll(async () => {
    await Promise.all([
      putUser(testCustomer),
      putUser(testManager),
      putRestaurant(testRestaurant),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      deleteUser(testCustomer.id),
      deleteUser(testManager.id),
      deleteRestaurant(testRestaurant.id),
    ]);
  });

  it('is triggered whenever SeatingStatusUpdatedEvent is sent to EventBridge [e2e] [slow]', async () => {
    // Arrange: create event matching rule that will cause triggering of Lambda function
    const evt: SeatingStatusUpdatedEvent = {
      seating: {
        id: `notifySeatingCancelledTest1_${uuid()}`, // ensure this data is uniquely identifiable to each test run
        restaurantId: 'notifySeatingCancelledTest1_restaurantId',
        userId: 'notifySeatingCancelledTest1_userId',
        status: SeatingStatus.PENDING,
        seatingTime: new Date().toISOString(),
        numSeats: 2,
        notes: '',
        createdAt: new Date().toISOString(),
      },
    };

    // Act: send event to EB
    await publishEvent(evt, EventDetailType.SEATING_CANCELLED);

    // Assert: Use the aws-testing-library Jest extension to check the EB eventId is present in the CloudWatch logs for the Lambda function
    // https://github.com/erezrokah/aws-testing-library/blob/master/src/jest/README.md#tohavelog
    // remember to use `await` with this `expect`
    const expectedLog = evt.seating.id;
    await expect({
      region: AWS_REGION,
      function: lambdaFunctionName,
      timeout: 25000, // needs a high timeout to account for 1) potential cold start and 2) latency in shipping logs from Lambda to CloudWatch
    }).toHaveLog(expectedLog);
  });

  it('sends correct message to the OutboundNotifications SQS queue [e2e] [slow]', async () => {
    const evt: SeatingStatusUpdatedEvent = {
      seating: {
        id: `notifySeatingCancelledTest2_${uuid()}`, // ensure this data is uniquely identifiable to each test run
        restaurantId: testRestaurant.id,
        userId: testCustomer.id,
        status: SeatingStatus.PENDING,
        seatingTime: new Date().toISOString(),
        numSeats: 2,
        notes: '',
        createdAt: new Date().toISOString(),
      },
    };
    const ebEvent = getEventBridgeEvent(EventDetailType.SEATING_CANCELLED, evt);
    await lambdaInvoker.invoke(ebEvent);

    // We could inspect the SQS queue here, but that's unreliable as another Lambda may get that message first.
    // So instead, we'll check the CloudWatch logs again.
    const expectedLog = `[${ebEvent.id}] Email message queued for restaurant manager`;

    await expect({
      region: AWS_REGION,
      function: lambdaFunctionName,
      timeout: 25000,
    }).toHaveLog(expectedLog);
  });
});
