import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import { errorMessages } from '@svc/lib/validation/messages';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { getSeating, updateSeatingStatus } from '@svc/lib/repos/ross-repo';
import { SeatingStatus } from '@svc/lib/types/ross-types';

/**
 * Updates seating status to CANCELLED
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

  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const seating = await getSeating(seatingId, restaurantId);
  if (!seating) {
    throw new createError.NotFound(errorMessages.notFound);
  }

  // Validate that seating being operated on belongs to the user
  if (user.id !== seating.userId) {
    throw new createError.Forbidden(errorMessages.forbidden);
  }

  switch (seating.status) {
    case SeatingStatus.PENDING:
    case SeatingStatus.ACCEPTED:
      // Seating meets the requirement for cancellation
      // Perform update
      await updateSeatingStatus(
        seatingId,
        restaurantId,
        SeatingStatus.CANCELLED,
      );
      break;
    case SeatingStatus.CANCELLED:
      // Seating already cancelled - no actions needed
      break;
    default:
      // Invalid state for cancellation
      // Signal error
      throw new createError.Conflict(
        'Cancellation not allowed for seating in current status',
      );
  }

  return {
    statusCode: 204,
    body: '',
  };
});
