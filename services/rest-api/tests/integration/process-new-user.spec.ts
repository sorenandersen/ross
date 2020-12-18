import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { AWS_REGION, cognitoConfig, ddbConfig } from '@svc/config';
import { TestUserManager } from '@tests/utils/test-user-manager';
import { getUser, deleteUser } from '@svc/lib/repos/ross-repo';

const ddb = new DocumentClient({ region: AWS_REGION });
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

  it.todo(
    'a UserCreatedEvent in EventBridge should save the user profile to DynamoDB',
  );

  it('a confirmed user sign up in Cognito should save the user profile to DynamoDB', async () => {
    // Arrange: Create and confirm Cognito user
    // Keep track of id's of created users
    const userContext = await userManager.createUser();
    createdUserIds.push(userContext.id);

    // const response = await ddb
    //   .get({
    //     TableName: ddbConfig.usersTable,
    //     Key: {
    //       id: userContext.id,
    //     },
    //   })
    //   .promise();
    // const ddbUser = response.Item as User | undefined;

    const ddbUser = await getUser(userContext.id);

    expect(ddbUser).toBeTruthy();
    expect(ddbUser?.email).toEqual(userContext.email);
    expect(ddbUser?.name).toEqual(userContext.name);
  });

  afterAll(async () => {
    //await Promise.all([userManager.dispose(), deleteDdbUsers()]);
  });
});
