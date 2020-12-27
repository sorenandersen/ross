const log = require('@dazn/lambda-powertools-logger');
const { putUser } = require('../../lib/repos/ross-repo');

module.exports.handler = async (event) => {
  log.debug('create-user event: ', { event });

  const user = {
    id: event.detail.id,
    name: event.detail.name,
    email: event.detail.email,
    createdAt: new Date().toJSON(),
  };

  await putUser(user);
};
