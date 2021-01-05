import { UserProfile } from '@svc/lib/types/ross-types';
import faker from 'faker';

const TEST_EMAIL_ADDRESS_DOMAIN =
  process.env.TEST_EMAIL_ADDRESS_DOMAIN || 'example.com';

export const randomEmail = (usernamePrefix?: string): string =>
  `test_${usernamePrefix}_${faker.random.uuid()}@${TEST_EMAIL_ADDRESS_DOMAIN}`.toLowerCase();

export const randomPassword = (): string =>
  `${faker.random.alphaNumeric(16)}s3rv3rl35515T!`;

export const randomName = () => faker.name.findName();

export const generateTestUser = (usernamePrefix: string) => {
  const email = randomEmail(usernamePrefix);
  return {
    email,
    username: email,
    name: randomName(),
    createdAt: new Date().toISOString(),
  } as UserProfile;
};
