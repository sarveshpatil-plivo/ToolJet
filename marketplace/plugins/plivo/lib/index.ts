import { QueryError, QueryService, QueryResult } from '@tooljet-marketplace/common';
import { SourceOptions, QueryOptions } from './types';
const plivo = require('plivo');

export default class PlivoService implements QueryService {
  getClient(authId: string, authToken: string): any {
    return new plivo.Client(authId, authToken);
  }

  async run(sourceOptions: SourceOptions, queryOptions: QueryOptions): Promise<QueryResult> {
    let result = {};

    // Validate required inputs before opening the try, so the specific
    // ('... is required') message surfaces as the thrown error instead of
    // being demoted into a QueryError detail by the catch below.
    switch (queryOptions.operation) {
      case 'send_sms':
        if (!queryOptions.from) throw new Error('From Number is required');
        if (!queryOptions.to) throw new Error('To Number is required');
        if (!queryOptions.body) throw new Error('Body is required');
        break;
      case 'make_call':
        if (!queryOptions.call_from) throw new Error('From Number is required');
        if (!queryOptions.call_to) throw new Error('To Number is required');
        if (!queryOptions.answer_url) throw new Error('Answer URL is required');
        break;
      case 'send_whatsapp':
        if (!queryOptions.wa_from) throw new Error('From Number is required');
        if (!queryOptions.wa_to) throw new Error('To Number is required');
        if (!queryOptions.wa_body && !queryOptions.wa_template) throw new Error('Message body or template is required');
        break;
      case 'lookup_number':
        if (!queryOptions.lookup_number) throw new Error('Number is required');
        break;
      default:
        throw new Error(`Unknown operation: ${queryOptions.operation}`);
    }

    try {
      const client = this.getClient(sourceOptions.authId, sourceOptions.authToken);

      switch (queryOptions.operation) {
        case 'send_sms':
          // plivo SDK v4.75.1: messages.create(src, dst, text)
          // https://github.com/plivo/plivo-node/blob/master/lib/resources/messages.js
          result = await client.messages.create(queryOptions.from, queryOptions.to, queryOptions.body);
          break;

        case 'make_call': {
          // plivo SDK v4.75.1: calls.create(from, to, answerUrl, params = {})
          // from, to and answerUrl are required (validated with `isRequired`); params is optional.
          // https://github.com/plivo/plivo-node/blob/master/lib/resources/call.js
          const params: { answerMethod?: string } = {};
          if (queryOptions.answer_method) {
            params.answerMethod = queryOptions.answer_method;
          }

          result = await client.calls.create(
            queryOptions.call_from,
            queryOptions.call_to,
            queryOptions.answer_url,
            params
          );
          break;
        }

        case 'send_whatsapp': {
          // plivo SDK v4.75.1: messages.create(src, dst, text, optionalParams).
          // optionalParams.type = 'whatsapp'; optionalParams.template is an object
          // { name, language, components? } passed through as-is (validated by the
          // SDK's templateSchema). See plivo-node lib/resources/messages.js and
          // lib/utils/template.js.
          const optionalParams: { type: string; template?: object } = { type: 'whatsapp' };
          if (queryOptions.wa_template) {
            let parsedTemplate: object;
            try {
              parsedTemplate = JSON.parse(queryOptions.wa_template);
            } catch (parseError) {
              throw new Error('Invalid WhatsApp template JSON');
            }
            optionalParams.template = parsedTemplate;
          }

          result = await client.messages.create(
            queryOptions.wa_from,
            queryOptions.wa_to,
            queryOptions.wa_body || '',
            optionalParams
          );
          break;
        }

        case 'lookup_number': {
          // plivo SDK v4.75.1: lookup.get(number, type = 'carrier').
          // Returns { phoneNumber, country, format, carrier }.
          // See plivo-node lib/resources/lookup.js.
          result = await client.lookup.get(queryOptions.lookup_number, queryOptions.lookup_type || undefined);
          break;
        }
      }
    } catch (error: any) {
      // The plivo SDK rejects with an Error whose message is the API response
      // body (see plivo-node lib/rest/request.js). Guard the dereference and
      // surface name/message rather than discarding all context.
      const errorMessage = error?.message || 'Unknown error';
      throw new QueryError('Query could not be completed', errorMessage, {
        name: error?.name,
        message: errorMessage,
      });
    }

    return {
      status: 'ok',
      data: result,
    };
  }
}
