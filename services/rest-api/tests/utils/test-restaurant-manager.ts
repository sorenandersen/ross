import _ from 'lodash';
import uuid from '@svc/lib/uuid';
import { assignRestaurantToUser } from '@svc/lib/auth/cognito-util';
import {
  putRestaurant,
  deleteRestaurant,
  deleteSeating,
  putSeating,
} from '@svc/lib/repos/ross-repo';
import {
  generateTestRestaurant,
  generateTestSeating,
} from './test-data-generator';
import { AuthenticatedUser, TestUserManager } from './test-user-manager';
import {
  Region,
  Restaurant,
  RestaurantVisibility,
  Seating,
  SeatingStatus,
  UserRole,
} from '@svc/lib/types/ross-types';

/* eslint no-console: 0 */

export interface TestRestaurantManagerConfig {
  userManager: TestUserManager;
  namePrefix: string;
}

/**
 * Helper class for managing the creation and deletion of restaurants in DynamoDB during test runs.
 */
export class TestRestaurantManager {
  private readonly createdRestaurants: Restaurant[] = [];
  private readonly createdSeatings: Seating[] = [];

  constructor(private readonly config: TestRestaurantManagerConfig) {}

  async createRestaurant(
    managerContext: AuthenticatedUser,
    shortname: string = uuid(),
    visibility: RestaurantVisibility = RestaurantVisibility.PUBLIC,
    region: Region = Region.NOT_SPECIFIED,
  ) {
    const restaurant = generateTestRestaurant(
      shortname,
      this.config.namePrefix,
      visibility,
      region,
      managerContext.user.id,
    );
    await putRestaurant(restaurant);
    this.createdRestaurants.push(restaurant);

    // Update Cognito user to be a manager of the test restaurant
    await assignRestaurantToUser(
      managerContext.user.id,
      restaurant.id,
      UserRole.MANAGER,
    );

    // Update test user to reflect new restaurant assignment
    managerContext.user.restaurantId = restaurant.id;
    managerContext.user.restaurantRole = UserRole.MANAGER;
    // In e2e mode the user context is provided from JWT claims (cognitoJwtAuthorizer),
    // in which case the users Cognito token must be refreshed after a restaurant assignment
    managerContext = await this.config.userManager.refreshUserToken(
      managerContext,
    );

    // Return test restaurant and the updated user context
    // that reflects ownership of the restaurant
    return { restaurant, managerContext };
  }

  async createRestaurants(
    managerContext: AuthenticatedUser,
    shortname: string = uuid(),
    visibility: RestaurantVisibility = RestaurantVisibility.PUBLIC,
    region: Region = Region.NOT_SPECIFIED,
    n: number,
  ) {
    return Promise.all(
      _.times(n, async () =>
        this.createRestaurant(managerContext, shortname, visibility, region),
      ),
    );
  }

  async createSeating(
    restaurantId: string,
    userId: string,
    shortname: string = uuid(),
    status: SeatingStatus,
  ) {
    const seating = generateTestSeating(
      shortname,
      this.config.namePrefix,
      restaurantId,
      userId,
      status,
    );
    await putSeating(seating);
    this.createdSeatings.push(seating);
    return seating;
  }

  /**
   * Delete all restaurants in DynamoDB that were created by this instance.
   */
  async dispose() {
    await Promise.all(
      _.concat(
        this.createdRestaurants.map(async (r) => await deleteRestaurant(r.id)),
        this.createdSeatings.map(
          async (s) => await deleteSeating(s.id, s.restaurantId),
        ),
      ),
    );
    this.createdRestaurants.length = 0;
    this.createdSeatings.length = 0;
  }
}
