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

  // Validate that current status is either PENDING or ACCEPTED
  if (
    seating.status !== SeatingStatus.PENDING &&
    seating.status !== SeatingStatus.ACCEPTED
  ) {
    throw new createError.Conflict('Cancellation no longer allowed');
  }

  // Provided visibility is valid. Perform update
  await updateSeatingStatus(seatingId, restaurantId, SeatingStatus.CANCELLED);

  return {
    statusCode: 204,
    body: '',
  };
});
