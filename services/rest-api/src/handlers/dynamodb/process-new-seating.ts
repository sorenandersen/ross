import { DynamoDBStreamEvent } from 'aws-lambda';
import log from '@dazn/lambda-powertools-logger';
import { publishEvents } from '@svc/lib/events/event-publisher';
import {
  Seating,
  EventDetailType,
  SeatingCreatedEvent,
} from '@svc/lib/types/ross-types.ts';
import { Marshaller } from '@aws/dynamodb-auto-marshaller';

const marshaller = new Marshaller();

export const handler = async (event: DynamoDBStreamEvent) => {
  log.debug('Received event', { event });

  // Filter out any non-INSERT events and map DynamoDB record into a domain event
  const newSeatingEvents: SeatingCreatedEvent[] = event.Records.filter(
    (r) => r.eventName === 'INSERT' && r.dynamodb?.NewImage,
  ).map((r) => {
    const seating: Seating = marshaller.unmarshallItem(
      r.dynamodb!.NewImage!,
    ) as any;
    return { seating };
  });

  if (newSeatingEvents.length) {
    // Publish events in a single request to EventBridge API
    await publishEvents(newSeatingEvents, EventDetailType.SEATING_CREATED);
  }
  log.debug(`Processed ${newSeatingEvents.length} new seating events.`);
};
