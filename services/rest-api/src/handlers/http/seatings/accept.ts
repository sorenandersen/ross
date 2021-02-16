import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import { errorMessages } from '@svc/lib/validation/messages';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { getSeating, updateSeatingStatus } from '@svc/lib/repos/ross-repo';
import { SeatingStatus } from '@svc/lib/types/ross-types';

/**
 * Updates seating status to ACCEPTED
 */
export const handler = wrap(async (event) => {
  const restaurantId = event.pathParameters?.restaurantId!;
  const seatingId = event.pathParameters?.seatingId!;

  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} ${
      event.rawPath
    } called`,
    { event },
  );

  // Validate that StaffUser is requesting a resource for his associated restaurant
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  if (user.restaurantId !== restaurantId) {
    throw new createError.Forbidden(errorMessages.forbidden);
  }

  // Fetch seating and validate that it is associated with restaurant
  const seating = await getSeating(seatingId, restaurantId);
  if (!seating) {
    throw new createError.NotFound(errorMessages.notFound);
  }
  if (seating.restaurantId !== restaurantId) {
    throw new createError.Forbidden(errorMessages.forbidden);
  }

  // Validate against current seating status
  switch (seating.status) {
    case SeatingStatus.PENDING:
      // Seating meets the requirement for being accepted
      // Perform update
      await updateSeatingStatus(
        seatingId,
        restaurantId,
        SeatingStatus.ACCEPTED,
      );
      break;
    case SeatingStatus.ACCEPTED:
      // Seating already accepted - no actions needed
      break;
    default:
      // Invalid state for operation
      // Signal error
      throw new createError.Conflict(
        'Operation not allowed for seating in current status',
      );
  }

  return {
    statusCode: 204,
    body: '',
  };
});
