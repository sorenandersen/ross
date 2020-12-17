const EventBridge = require('aws-sdk/clients/eventbridge');
const log = require('@dazn/lambda-powertools-logger');
const { EVENTBRIDGE_SERVICE_BUS_NAME, AWS_REGION } = process.env;
const ebClient = new EventBridge({ region: AWS_REGION });

module.exports.handler = async (event) => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    const user = {
      id: event.request.userAttributes.sub,
      username: event.request.userAttributes.email,
      email: event.request.userAttributes.email,
      name: event.request.userAttributes.name,
    };

    const publishRequest = {
      Entries: [
        {
          EventBusName: EVENTBRIDGE_SERVICE_BUS_NAME,
          Source: 'infra',
          DetailType: 'USER_CREATED',
          Detail: JSON.stringify(user),
        },
      ],
    };

    let result;
    try {
      result = await ebClient.putEvents(publishRequest).promise();
    } catch (error) {
      log.error(
        'Error publishing events to EventBridge',
        { publishRequest },
        error,
      );
      throw error;
    }
    if (result.FailedEntryCount) {
      log.error('Error publishing one or more events to EventBridge', {
        publishRequest,
        result,
      });
      throw new Error('Error publishing one or more events to EventBridge');
    }
    log.debug('Published events to EventBridge', {
      publishRequest,
      result,
    });
  }

  return event;
};
