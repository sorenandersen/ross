import { User } from '@svc/lib/types/ross-types';
import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { generateTestUser, randomPassword } from './test-data-generator';

/* eslint no-console: 0 */

export interface TestUserManagerConfig {
  usernamePrefix: string;
  cognitoUserPoolId: string;
  cognitoUserPoolClientId: string;
  region: string;
}

export interface AuthenticatedUser {
  user: User;
  idToken: string;
}

interface CreatedUserContext {
  user: User;
  inCognito: boolean;
}

/**
 * Helper class for managing the creation and deletion of users in Cognito during test runs.
 */
export class TestUserManager {
  private readonly createdUsers: CreatedUserContext[] = [];

  private readonly cognitoIsp: CognitoIdentityServiceProvider;

  constructor(private readonly config: TestUserManagerConfig) {
    this.cognitoIsp = new CognitoIdentityServiceProvider({
      region: config.region,
    });
  }

  async createUserWithPassword(password: string) {
    const userProfile = generateTestUser(this.config.usernamePrefix);
    const username = userProfile.email;

    const signUpResult = await this.cognitoIsp
      .signUp({
        ClientId: this.config.cognitoUserPoolClientId,
        Username: username,
        Password: password,
        UserAttributes: [
          { Name: 'name', Value: userProfile.name },
          { Name: 'email', Value: userProfile.email },
        ],
      })
      .promise();

    // Confirm the user in Cognito (effectively skipping the verification code)
    // which will trigger the PostConfirmation hook
    await this.cognitoIsp
      .adminConfirmSignUp({
        UserPoolId: this.config.cognitoUserPoolId,
        Username: username,
      })
      .promise();

    const user: User = {
      ...userProfile,
      id: signUpResult.UserSub,
    };
    this.createdUsers.push({ user, inCognito: true });
    return user;
  }

  async createUser() {
    const password = randomPassword();
    const testUser = await this.createUserWithPassword(password);
    return testUser;
  }

  async createAndSignInUser() {
    const password = randomPassword();
    const testUser = await this.createUserWithPassword(password);
    return this.signInUser(testUser, password);
  }

  async createAndSignInUsers(n: number) {
    return Promise.all(_.times(n, async () => this.createAndSignInUser()));
  }

  /**
   * Generates a user object without saving to Cognito.
   */
  createInMemoryUser(userId?: string) {
    const user: User = {
      id: userId || uuidv4(),
      ...generateTestUser(this.config.usernamePrefix),
    };
    this.createdUsers.push({ user, inCognito: false });
    return user;
  }

  async signInUser(user: User, password: string) {
    try {
      const signinResult = await this.cognitoIsp
        .initiateAuth({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.config.cognitoUserPoolClientId,
          AuthParameters: {
            USERNAME: user.username,
            PASSWORD: password,
          },
        })
        .promise();

      if (!signinResult.AuthenticationResult) {
        return Promise.reject(new Error('Authentication failed'));
      }

      return {
        user,
        idToken: signinResult.AuthenticationResult?.IdToken!,
      } as AuthenticatedUser;
    } catch (error) {
      console.error('Error signing in Cognito user', error);
      throw error;
    }
  }

  async refreshUserToken(refreshToken: string) {
    try {
      const refreshResult = await this.cognitoIsp
        .initiateAuth({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: this.config.cognitoUserPoolClientId,
          AuthParameters: {
            REFRESH_TOKEN: refreshToken,
          },
        })
        .promise();

      if (!refreshResult.AuthenticationResult) {
        return Promise.reject(new Error('Token refresh failed'));
      }

      return {
        idToken: refreshResult.AuthenticationResult?.IdToken!,

        // TODO: Extend AuthenticatedUser to also carry RefreshToken
        // **
        // **
      } as AuthenticatedUser;
    } catch (error) {
      console.error('Error refreshing token of Cognito user', error);
      throw error;
    }
  }

  private async deleteUserData(userContext: CreatedUserContext) {
    if (userContext.inCognito) {
      await this.cognitoIsp
        .adminDeleteUser({
          UserPoolId: this.config.cognitoUserPoolId,
          Username: userContext.user.username,
        })
        .promise();
    }
  }

  /**
   * Delete all users in Cognito that were created by this instance.
   */
  async dispose() {
    await Promise.all(
      this.createdUsers.map(async (u) => this.deleteUserData(u)),
    );
    this.createdUsers.length = 0;
  }
}
