import log from '@dazn/lambda-powertools-logger';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

export type PromiseHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<APIGatewayProxyResult>;

export const wrap = (handler: PromiseHandler): PromiseHandler => async (
  event: APIGatewayProxyEventV2,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  try {
    return await handler(event, context);
  } catch (error) {
    const statusCodeError =
      error.statusCode && typeof error.statusCode === 'number';

    if (statusCodeError && error.statusCode < 500) {
      // **
      // HTTP status code error
      // **
      log.warn('statusCodeError', {
        statusCode: error.statusCode,
        error,
        event,
        context,
      });

      // Reveal error as-is
      return {
        statusCode: error.statusCode,
        body: JSON.stringify({
          message: error.message,
        }),
      };
    }

    // **
    // Non-HTTP or server error
    // Log and return nondisclosed error
    // **
    log.error(
      'Unhandled error',
      {
        event,
        context,
      },
      error,
    );

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    };
  }
};
