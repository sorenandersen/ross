/**
 * Helper module declaring application-wide constants for ensuring and accessing environment variables.
 * All access should go via this helper and not directly to `process.env.VARIABLE_NAME`.
 */
const getEnvString = (key: string, required: boolean = false) => {
  const val = process.env[key];
  if (required && !val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val!;
};

export const APP_NAME = 'ross';

export const STAGE = getEnvString('STAGE', true);

export const AWS_REGION = getEnvString('REGION', true);

export const ddbConfig = {
  usersTable: getEnvString('DDB_TABLE_USERS'),
  restaurantsTable: getEnvString('DDB_TABLE_RESTAURANTS'),
  seatingsTable: getEnvString('DDB_TABLE_SEATINGS'),
};

export const eventBridgeConfig = {
  serviceBusName: getEnvString('EVENTBRIDGE_SERVICE_BUS_NAME'),
  defaultSource: 'rest-api',
};

export const cognitoConfig = {
  userPoolId: getEnvString('COGNITO_USER_POOL_ID'),
  staffUserPoolClientId: getEnvString('COGNITO_USER_POOL_CLIENT_ID_STAFF'),
};

export const apiGatewayConfig = {
  domainName: getEnvString('API_GW_DOMAIN'),
  getBaseUrl: () =>
    `https://${getEnvString(
      'API_GW_DOMAIN',
    )}.execute-api.${AWS_REGION}.amazonaws.com/`,
};

export const lambdaConfig = {
  functionNamePrefix: `${APP_NAME}-rest-api-${STAGE}-`,
};

export const sqsConfig = {
  outboundNotificationsQueueUrl: getEnvString(
    'OUTBOUND_NOTIFICATIONS_QUEUE_URL',
  ),
  outboundNotificationsDlqUrl: getEnvString('OUTBOUND_NOTIFICATIONS_DLQ_URL'),
};

export const notificationConfig = {
  email: {
    fromAddress: getEnvString('OUTBOUND_NOTIFICATIONS_EMAIL_FROM_ADDRESS'),
  },
};

export const s3Config = {
  mediaBucket: getEnvString('S3_MEDIA_BUCKET'),
  restaurantProfilePhotosBucketPrefix: getEnvString(
    'S3_MEDIA_BUCKET_RESTAURANT_PROFILES_PREFIX',
  ),
};
