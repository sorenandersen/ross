module.exports.handler = async (event) => {
  console.log('>>>>> 1, event: ', event);
  console.log('>>>>> 2, event.triggerSource: ', event.triggerSource);
  if (event.triggerSource === 'PostConfirmation_ConfirmSignUp') {
    console.log('>>>>> 3, trigger: PostConfirmation');
  }
};
