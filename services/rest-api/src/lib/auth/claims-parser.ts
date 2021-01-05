import { User } from '@svc/lib/types/ross-types';

export type ClaimsMap = {
  [name: string]: string | number | boolean | string[];
};

export const getUserFromClaims = (claims: ClaimsMap) =>
  ({
    id: claims.sub,
    name: claims.name,
    email: claims.email,
    username: claims['cognito:username'],
    restaurantId: claims['custom:restaurantId'],
    restaurantRole: claims['custom:restaurantRole'],
  } as User);

export const getClaimsFromUser = (user: User) => {
  if (!user) {
    return {};
  }
  return {
    sub: user.id,
    name: user.name,
    'cognito:username': user.username,
    email: user.email,
    'custom:restaurantId': user.restaurantId,
    'custom:restaurantRole': user.restaurantRole,
  };
};
