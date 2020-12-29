// const log = require('@dazn/lambda-powertools-logger');
// const { putUser } = require('../../lib/repos/ross-repo');

// module.exports.handler = async (event) => {
//   log.debug('create-user event: ', { event });

//   // Grab user from EventBridge detail and save to DynamoDB
//   const user = {
//     id: event.detail.user.id,
//     name: event.detail.user.name,
//     email: event.detail.user.email,
//     createdAt: new Date().toJSON(),
//   };

//   await putUser(user);
// };
