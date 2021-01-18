import log from '@dazn/lambda-powertools-logger';
import { wrap } from '@svc/lib/middleware/apigw-error-handler';
import createError from 'http-errors';
import seatings_schema from './schema.json';
import { validate } from '@svc/lib/validation/schema-validator';
import uuid from '@svc/lib/uuid';
import { getUserFromClaims } from '@svc/lib/auth/claims-parser';
import { putSeating } from '@svc/lib/repos/ross-repo';
import { Seating, SeatingStatus } from '@svc/lib/types/ross-types';

/**
 * Create new restaurant and assign to current user via the "managerId" field
 */
export const handler = wrap(async (event) => {
  const restaurantId = event.pathParameters?.id!;
  log.debug(
    `${event.requestContext?.http?.method?.toUpperCase()} /restaurants/${restaurantId}/seatings called`,
    { event },
  );
  const user = getUserFromClaims(event.requestContext.authorizer?.jwt.claims!);
  const seating = JSON.parse(event.body || '{}') as Seating;

  // TODO validate restaurant exists and is public

  // Validate seating
  const validateResult = validate(seatings_schema, seating);
  if (!validateResult.valid) {
    throw new createError.BadRequest(validateResult.errorsText);
  }

  // TODO validate that seatingTime is forward in time

  // Set defaults
  seating.id = uuid();
  seating.restaurantId = restaurantId;
  seating.userId = user.id;
  seating.status = SeatingStatus.PENDING;
  seating.createdAt = new Date().toISOString();

  // Persist
  await putSeating(seating);

  return {
    statusCode: 201,
    headers: {
      location: `/restaurants/${restaurantId}/seatings/${seating.id}`,
    },
    body: JSON.stringify({ id: seating.id }),
  };
});
