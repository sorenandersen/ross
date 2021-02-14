import { AWS_REGION, lambdaConfig, s3Config } from '@svc/config';
import { handler } from '@svc/handlers/s3/process-restaurant-profile-photo';
import S3 from 'aws-sdk/clients/s3';
import { readFileSync } from 'fs';
import path from 'path';
import { clearAllObjects } from 'aws-testing-library/lib/utils/s3';
import uuid from '@svc/lib/uuid';
import { LambdaFunctionHandlerInvoker } from '@tests/utils/handler-invokers/lambda-function-handler-invoker';
import {
  deleteRestaurant,
  getRestaurant,
  putRestaurant,
} from '@svc/lib/repos/ross-repo';
import { getS3Event } from '@tests/utils/lambda-payload-generator';
import { Restaurant, RestaurantVisibility } from '@svc/lib/types/ross-types';
import { generateTestRestaurant } from '@tests/utils/test-data-generator';

const lambdaFunctionName = `${lambdaConfig.functionNamePrefix}s3ProcessRestaurantProfilePhoto`;
const s3Client = new S3({ region: AWS_REGION });
const lambdaInvoker = new LambdaFunctionHandlerInvoker({
  awsRegion: AWS_REGION,
  lambdaFunctionName,
  handler,
});
const TEST_RESTAURANTID_PREFIX = 'processRestaurantProfilePhotoTest'; // used to easily identify S3 objects for cleanup

const getRestaurantId = (suffix: string) =>
  `${TEST_RESTAURANTID_PREFIX}_${suffix}`;
const readTestFile = (filename: string) =>
  readFileSync(path.join(__dirname, `../test-data/${filename}`));

let createdRestaurants: Restaurant[] = [];

//
// Test photo
// ../test-data/restaurant-profile-pic-1.png
//
describe('`s3ProcessRestaurantProfilePhoto` Lambda function', () => {
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

  const deleteTestRestaurants = async () => {
    await Promise.all(
      createdRestaurants.map(async (r) => await deleteRestaurant(r.id)),
    );
    createdRestaurants.length = 0;
  };

  const uploadPhotoForRestaurant = async (restaurantId: string) => {
    const filename = 'restaurant-profile-pic-1.png';
    const file = readTestFile(filename);
    const key = `${s3Config.restaurantProfilePhotosBucketPrefix}${restaurantId}.png`;
    await s3Client
      .putObject({
        Key: key,
        Bucket: s3Config.mediaBucket,
        Body: file,
      })
      .promise();
    return key;
  };

  const cleanupS3 = async () => {
    // Use a prefix here to ensure we only delete the S3 objects that we created as part of this test run.
    await clearAllObjects(
      AWS_REGION,
      s3Config.mediaBucket,
      `${s3Config.restaurantProfilePhotosBucketPrefix}${TEST_RESTAURANTID_PREFIX}`,
    );
  };

  beforeAll(async () => {
    // Clear existing objects just in case the afterAll from previous test run didn't execute ok.
    await cleanupS3();
  });

  afterAll(async () => {
    await Promise.all([cleanupS3(), deleteTestRestaurants()]);
  });

  it('is triggered whenever file is uploaded to S3 [e2e]', async () => {
    const restaurantId = getRestaurantId(`${uuid()}_r1`); // this needs to be unique for every test run

    // ACT: upload file to S3 using the restaurantId as the filename
    await uploadPhotoForRestaurant(restaurantId);

    // ASSERT: check CloudWatch logs to verify function invoked
    const expectedLog = restaurantId;
    await expect({
      region: AWS_REGION,
      function: lambdaFunctionName,
      timeout: 20000,
    }).toHaveLog(expectedLog);
  });

  it('updates `profilePhotoUrlPath` field in Restaurant record in DDB', async () => {
    // ARRANGE: create test restaurant in DDB
    const testRestaurant = await createTestRestaurant('r1');

    const objectKey = `${s3Config.restaurantProfilePhotosBucketPrefix}${testRestaurant.id}.png`;

    // ACT: invoke func passing in an S3 event payload
    const event = getS3Event(
      s3Config.mediaBucket,
      objectKey,
      AWS_REGION,
      'ObjectCreated:Put',
    );
    await lambdaInvoker.invoke(event);

    // ASSERT: fetch back restaurant from DDB to verify the field has been updated
    const savedRestaurant = await getRestaurant(testRestaurant.id);
    expect(savedRestaurant?.profilePhotoUrlPath).toEqual(objectKey);
  });
});
