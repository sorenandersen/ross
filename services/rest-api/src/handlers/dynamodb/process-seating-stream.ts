import { DynamoDBStreamEvent } from 'aws-lambda';
import log from '@dazn/lambda-powertools-logger';
import { publishEvents } from '@svc/lib/events/event-publisher';
import {
  Seating,
  EventDetailType,
  SeatingCreatedEvent,
  SeatingStatusUpdatedEvent,
  SeatingStatus,
} from '@svc/lib/types/ross-types.ts';
import { Marshaller } from '@aws/dynamodb-auto-marshaller';

// DynamoDB API docs on streams record:
// https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_Record.html

const marshaller = new Marshaller();

export const handler = async (event: DynamoDBStreamEvent) => {
  log.debug('Received event', { event });

  await publishSeatingCreatedEvents(event);
  await publishSeatingUpdatedEvents(event);
};

const publishSeatingCreatedEvents = async (event: DynamoDBStreamEvent) => {
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
    log.debug(`Processed ${newSeatingEvents.length} new seating events.`);
  }
};

const publishSeatingUpdatedEvents = async (event: DynamoDBStreamEvent) => {
  // Capture all events of status change and map DynamoDB record into a domain event
  const seatingStatusUpdatedEvents: SeatingStatusUpdatedEvent[] = event.Records.filter(
    (r) =>
      // Get updated records
      r.eventName === 'MODIFY' && r.dynamodb?.NewImage && r.dynamodb?.OldImage,
  )
    .filter((record) => {
      // Get records where status has changed
      try {
        const newStatus =
          SeatingStatus[record.dynamodb!.NewImage!.status!.S! as SeatingStatus];
        const oldStatus =
          SeatingStatus[record.dynamodb!.OldImage!.status!.S! as SeatingStatus];
        return newStatus !== oldStatus;
      } catch (error) {
        // Invalid status
        return false;
      }
    })
    .map((record) => {
      const seating: Seating = marshaller.unmarshallItem(
        record.dynamodb!.NewImage!,
      ) as any;
      return { seating };
    });

  // Now filter per new status
  if (seatingStatusUpdatedEvents.length) {
    const seatingCancelledEvents = seatingStatusUpdatedEvents.filter(
      (event) => event.seating.status === SeatingStatus.CANCELLED,
    );
    if (seatingCancelledEvents.length) {
      // Publish events in a single request to EventBridge API
      await publishEvents(
        seatingCancelledEvents,
        EventDetailType.SEATING_CANCELLED,
      );
      log.debug(
        `Processed ${seatingCancelledEvents.length} seating cancelled events.`,
      );
    }
  }
};
