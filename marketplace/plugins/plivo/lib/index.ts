import { QueryError, QueryService, QueryResult } from '@tooljet-marketplace/common';
import { SourceOptions, QueryOptions } from './types';
const plivo = require('plivo');

export default class PlivoService implements QueryService {
  getClient(authId: string, authToken: string): any {
    return new plivo.Client(authId, authToken);
  }

  async run(sourceOptions: SourceOptions, queryOptions: QueryOptions): Promise<QueryResult> {
    let result = {};

    if (!sourceOptions.authId || !sourceOptions.authToken) {
      throw new Error('Plivo Auth ID and Auth Token are required');
    }

    // Validate required inputs before the try so the specific message surfaces.
    switch (queryOptions.operation) {
      case 'send_sms':
        if (typeof queryOptions.from !== 'string' || !queryOptions.from.trim())
          throw new Error('From Number is required');
        if (typeof queryOptions.to !== 'string' || !queryOptions.to.trim()) throw new Error('To Number is required');
        if (typeof queryOptions.body !== 'string' || !queryOptions.body.trim()) throw new Error('Body is required');
        break;
      case 'make_call':
        if (typeof queryOptions.from !== 'string' || !queryOptions.from.trim())
          throw new Error('From Number is required');
        if (typeof queryOptions.to !== 'string' || !queryOptions.to.trim())
          throw new Error('To Number is required');
        if (typeof queryOptions.answer_url !== 'string' || !queryOptions.answer_url.trim())
          throw new Error('Answer URL is required');
        if (
          typeof queryOptions.answer_method === 'string' &&
          queryOptions.answer_method.trim() &&
          !['GET', 'POST'].includes(queryOptions.answer_method.toUpperCase())
        )
          throw new Error('Answer Method must be GET or POST');
        break;
      default:
        throw new Error(`Unknown operation: ${queryOptions.operation}`);
    }

    try {
      const client = this.getClient(sourceOptions.authId, sourceOptions.authToken);

      switch (queryOptions.operation) {
        case 'send_sms':
          result = await client.messages.create(
            queryOptions.from.trim(),
            queryOptions.to.trim(),
            queryOptions.body.trim()
          );
          break;

        case 'make_call': {
          const params: { answerMethod?: string } = {};
          if (typeof queryOptions.answer_method === 'string' && queryOptions.answer_method.trim()) {
            // Already validated to GET/POST above.
            params.answerMethod = queryOptions.answer_method.trim().toUpperCase();
          }

          result = await client.calls.create(
            queryOptions.from.trim(),
            queryOptions.to.trim(),
            queryOptions.answer_url.trim(),
            params
          );
          break;
        }

        default:
          throw new Error(`Unhandled operation: ${queryOptions.operation}`);
      }
    } catch (error: any) {
      // Forward Plivo's API error message so the caller keeps the context.
      const errorMessage = error?.message || error?.name || 'Unknown error';
      throw new QueryError('Query could not be completed', errorMessage, {
        name: error?.name,
        message: errorMessage,
        status: error?.status,
        statusText: error?.statusText,
        apiId: error?.apiID,
      });
    }

    return {
      status: 'ok',
      data: result,
    };
  }
}
