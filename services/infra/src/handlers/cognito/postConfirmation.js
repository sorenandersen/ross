module.exports.handler = async (event) => {
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    // TODO persist to DynamoDB
  }

  return event;
};
