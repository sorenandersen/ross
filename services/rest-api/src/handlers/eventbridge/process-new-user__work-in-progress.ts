// import log from '@dazn/lambda-powertools-logger';
// import { EventBridgeHandler } from 'aws-lambda';
// import { EventDetailType, UserCreatedEvent } from '@svc/lib/types/ross-types';
// import { putUser } from '@svc/lib/repos/ross-repo';

// export const handler: EventBridgeHandler<
//   EventDetailType.USER_CREATED,
//   UserCreatedEvent,
//   any
// > = async (event) => {
//   log.debug('received event', { event });
//   const msg = event.detail;
//   await putUser(msg.user);
// };
