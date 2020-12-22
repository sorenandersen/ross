import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import log from '@dazn/lambda-powertools-logger';
import { AWS_REGION, cognitoConfig } from '@svc/config';

const cognitoIsp = new CognitoIdentityServiceProvider({
  region: AWS_REGION,
});

// TODO: restaurantRole as enum [ ADMIN, STAFF ]
export const updateUserAttributes = async (
  username: string,
  restaurantId: string,
  restaurantRole: string,
) => {
  await cognitoIsp
    .adminUpdateUserAttributes({
      UserPoolId: cognitoConfig.userPoolId,
      Username: username,
      UserAttributes: [
        { Name: 'custom:restaurantId', Value: restaurantId },
        { Name: 'custom:restaurantRole', Value: restaurantRole },
      ],
    })
    .promise();
};
