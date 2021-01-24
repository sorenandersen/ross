import { AWS_REGION, sqsConfig } from '@svc/config';
import SQS from 'aws-sdk/clients/sqs';
import log from '@dazn/lambda-powertools-logger';
import { SendEmailRequest } from './types';

const sqs = new SQS({ region: AWS_REGION });
const QUEUE_URL = sqsConfig.outboundNotificationsQueueUrl;

/**
 * Queues an email for delivery.
 * @param email
 */
export const queueEmail = async (email: SendEmailRequest) => {
  log.debug('Queuing email...', { email });
  const queueResult = await sqs
    .sendMessage({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(email),
    })
    .promise();
  log.info('Queued email.', { email, queueResult });
  return queueResult;
};
