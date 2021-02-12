import { S3Handler } from 'aws-lambda';
import log from '@dazn/lambda-powertools-logger';
import { extname } from 'path';
import { updateRestaurantProfilePhotoPath } from '@svc/lib/repos/ross-repo';
import { s3Config } from '@svc/config';

/**
 * Strip folder path and file extension in order to get path
 * @param objectKey
 */
const getRestaurantIdFromObjectKey = (objectKey: string) =>
  objectKey
    .replace(s3Config.restaurantProfilePhotosBucketPrefix, '')
    .replace(extname(objectKey), '');

/**
 * Handler for S3:ObjectCreated:* events underneath RESTAURANT_PROFILES prefix.
 */
export const handler: S3Handler = async (event) => {
  log.debug('Received S3 event', { event });
  const objectKey = event.Records[0].s3.object.key;
  const restaurantId = getRestaurantIdFromObjectKey(objectKey);
  try {
    await updateRestaurantProfilePhotoPath(restaurantId, objectKey);
    log.info('Completed updateRestaurantProfilePhotoPath.', {
      restaurantId,
      objectKey,
    });
  } catch (error) {
    log.error(
      'Error with updateRestaurantProfilePhotoPath ',
      { restaurantId, objectKey },
      error,
    );
    throw error;
  }
};
