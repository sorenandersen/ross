import log from '@dazn/lambda-powertools-logger';
import { EventBridgeHandler } from 'aws-lambda';
import {
  SeatingStatusUpdatedEvent,
  EventDetailType,
} from '@svc/lib/types/ross-types';
import { getRestaurant, getUser } from '@svc/lib/repos/ross-repo';
import { SendEmailRequest } from '@svc/lib/notifications/types';
import { notificationConfig } from '@svc/config';
import { queueEmail } from '@svc/lib/notifications/email-queuer';

export const handler: EventBridgeHandler<
  EventDetailType.SEATING_CANCELLED,
  SeatingStatusUpdatedEvent,
  any
> = async (event) => {
  log.debug(`[${event['detail-type']}] Received event`, { event });
  const msg = event.detail;

  // From DynamoDB fetch entities
  // TODO get entities with batchGet instead of fetching them individually
  const customer = await getUser(msg.seating.userId);
  const restaurant = await getRestaurant(msg.seating.restaurantId);
  if (!restaurant) {
    log.warn(`No restaurant found for seating; no email will be sent'`, {
      event,
    });
    return null;
  }
  if (!customer) {
    log.warn(`No customer (user) found for seating; no email will be sent'`, {
      event,
    });
    return null;
  }
  const manager = await getUser(restaurant.managerId);
  if (!manager) {
    log.warn(`No manager (user) found for restaurant; no email will be sent'`, {
      event,
    });
    return null;
  }

  // **
  // Notify restaraunt manager
  // **
  const managerEmail: SendEmailRequest = {
    fromAddress: notificationConfig.email.fromAddress,
    destination: {
      ToAddresses: [manager.email],
    },
    message: {
      Subject: {
        Data: `[ROSS] [${msg.seating.status}] Reservation for restaurant ${restaurant.name} was cancelled`,
      },
      Body: {
        Html: {
          Data: `A reservation for your restaurant was cancelled.<br>
            <br>
            Current status: ${msg.seating.status}<br>
            <br>
            <b>Summary</b><br>
            Restaurant name: ${restaurant.name}<br>
            Customer name: ${customer.name}<br>
            Reservation date and time: ${msg.seating.seatingTime}<br>
            Number of seats: ${msg.seating.numSeats}<br>
            Notes: ${msg.seating.notes}
            `,
        },
      },
    },
  };

  await queueEmail(managerEmail);
  log.info(`[${event.id}] Email message queued for restaurant manager`);

  return null;
};
