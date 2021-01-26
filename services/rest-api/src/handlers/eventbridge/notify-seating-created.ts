import log from '@dazn/lambda-powertools-logger';
import { EventBridgeHandler } from 'aws-lambda';
import {
  SeatingCreatedEvent,
  EventDetailType,
} from '@svc/lib/types/ross-types';
import { getRestaurant, getUser } from '@svc/lib/repos/ross-repo';
import { SendEmailRequest } from '@svc/lib/notifications/types';
import { notificationConfig } from '@svc/config';
import { queueEmail } from '@svc/lib/notifications/email-queuer';

export const handler: EventBridgeHandler<
  EventDetailType.SEATING_CREATED,
  SeatingCreatedEvent,
  any
> = async (event) => {
  log.debug(`[${event['detail-type']}] Received event`, { event });
  const msg = event.detail;

  // From DynamoDB fetch user creating the seating, and the restaurant for which the seating concerns
  const user = await getUser(msg.seating.userId);
  const restaurant = await getRestaurant(msg.seating.restaurantId);
  if (!user) {
    log.warn(`No user found for seating; no email will be sent'`, { event });
    return null;
  }
  if (!restaurant) {
    log.warn(`No restaurant found for seating; no email will be sent'`, {
      event,
    });
    return null;
  }

  const customerEmail: SendEmailRequest = {
    fromAddress: notificationConfig.email.fromAddress,
    destination: {
      ToAddresses: [user.email],
    },
    message: {
      Subject: {
        Data: `[ROSS] [${msg.seating.status}] Your reservation at ${restaurant.name}`,
      },
      Body: {
        Html: {
          Data: `Thank you for your reservation!<br>
            <br>
            Current status of your reservation is: ${msg.seating.status}<br>
            <br>
            <b>Summary</b><br>
            Restaurant name: ${restaurant.name}<br>
            Reservation date and time: ${msg.seating.seatingTime}<br>
            Number of seats: ${msg.seating.numSeats}<br>
            Notes: ${msg.seating.notes}
            `,
        },
      },
    },
  };
  await queueEmail(customerEmail);
  log.info(`[${event.id}] Email message queued for customer`);
  return null;
};
