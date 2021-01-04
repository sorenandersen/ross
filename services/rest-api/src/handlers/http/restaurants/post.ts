import log from '@dazn/lambda-powertools-logger';
import uuid from '@svc/lib/uuid';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { putRestaurant } from '@svc/lib/repos/ross-repo';
import {
  Restaurant,
  RestaurantApprovalStatus,
  RestaurantAvailability,
} from '@svc/lib/types/ross-types';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Gets profile of current user.
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);

  // TODO validate user and body
  const restaurant = JSON.parse(event.body!) as Restaurant;

  // Set defaults
  restaurant.id = uuid();
  restaurant.approvalStatus = RestaurantApprovalStatus.APPROVED; // For a future version, a RossAdmin should approve new restaurants before managers can operate on them.
  restaurant.availability = RestaurantAvailability.PRIVATE;
  restaurant.managerId = user.id;
  restaurant.createdAt = new Date().toJSON();

  // Persist
  await putRestaurant(restaurant);

  /*
  TODO
  - I can create a new Restaurant, setting a name, description and a region from a preconfigured list of supported regions.
  - I can mark restaurants that I own as publicly available.
  - I can upload a profile photo for restaurants that I own
  */

  return {
    statusCode: 201,
    headers: { location: `/restaurants/${restaurant.id}` },
    body: JSON.stringify({ id: restaurant.id }),
  };
};
