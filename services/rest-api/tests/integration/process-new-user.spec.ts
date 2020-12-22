import { AWS_REGION, cognitoConfig } from '@svc/config';
import { TestUserManager } from '@tests/utils/test-user-manager';
import { getUser, deleteUser } from '@svc/lib/repos/ross-repo';

const userManager = new TestUserManager({
  cognitoUserPoolId: cognitoConfig.userPoolId,
  cognitoUserPoolClientId: cognitoConfig.staffUserPoolClientId,
  region: AWS_REGION,
  usernamePrefix: 'process-new-user',
});

describe('`ebProcessNewUser` Lambda function', () => {
  let createdUserIds: string[] = [];

  const deleteDdbUsers = async () => {
    await Promise.all(createdUserIds.map(async (id) => await deleteUser(id)));
    createdUserIds = [];
  };

  it('a confirmed user sign up in Cognito should save the user profile to DynamoDB', async () => {
    // Arrange:
    // No arrangement to be done; createUser call kicks off the flow

    // Act: Create and confirm Cognito user
    // Keep track of id's of created users
    const userContext = await userManager.createUser();
    createdUserIds.push(userContext.id);

    // Sleep, to account for slight EventBridge delay
    await new Promise((r) => setTimeout(r, 1000));

    // Assert
    const ddbUser = await getUser(userContext.id);

    expect(ddbUser).toBeTruthy();
    expect(ddbUser?.email).toEqual(userContext.email);
    expect(ddbUser?.name).toEqual(userContext.name);
  });

  afterAll(async () => {
    await Promise.all([userManager.dispose(), deleteDdbUsers()]);
  });
});
