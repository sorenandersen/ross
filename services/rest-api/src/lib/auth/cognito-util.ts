import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import log from '@dazn/lambda-powertools-logger';
import { AWS_REGION, cognitoConfig } from '@svc/config';
import { UserRole } from '@svc/lib/types/ross-types';

const cognitoIsp = new CognitoIdentityServiceProvider({
  region: AWS_REGION,
});

export const assignRestaurantToUser = async (
  userId: string,
  restaurantId?: string,
  restaurantRole?: UserRole,
) => {
  log.debug('assignRestaurantToUser', { userId, restaurantId, restaurantRole });

  await cognitoIsp
    .adminUpdateUserAttributes({
      UserPoolId: cognitoConfig.userPoolId,
      Username: userId,
      UserAttributes: [
        { Name: 'custom:restaurantId', Value: restaurantId },
        { Name: 'custom:restaurantRole', Value: restaurantRole },
      ],
    })
    .promise();
};
