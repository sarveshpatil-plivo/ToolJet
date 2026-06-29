'use strict';

// Mock the plivo SDK so we can assert how PlivoService calls it, without any network.
const messagesCreate = jest.fn();
const callsCreate = jest.fn();
const lookupGet = jest.fn();

jest.mock('plivo', () => ({
  Client: jest.fn().mockImplementation((authId, authToken) => ({
    // expose the args the client was constructed with for assertions
    __authId: authId,
    __authToken: authToken,
    messages: { create: messagesCreate },
    calls: { create: callsCreate },
    lookup: { get: lookupGet },
  })),
}));

const plivo = require('plivo');
const PlivoService = require('../lib').default;

describe('PlivoService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlivoService();
  });

  const sourceOptions = { authId: 'test-auth-id', authToken: 'test-auth-token' };

  describe('send_sms', () => {
    it('calls messages.create(from, to, body) and returns the SDK response', async () => {
      const sdkResponse = { messageUuid: ['abc-123'], apiId: 'api-1' };
      messagesCreate.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'send_sms',
        from: '+14150000000',
        to: '+14151111111',
        body: 'hello',
      });

      expect(plivo.Client).toHaveBeenCalledWith('test-auth-id', 'test-auth-token');
      expect(messagesCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'hello');
      expect(callsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });
  });

  describe('make_call', () => {
    it('calls calls.create(from, to, answerUrl, params) with the answer method', async () => {
      const sdkResponse = { requestUuid: 'req-9', apiId: 'api-2', message: 'call fired' };
      callsCreate.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'make_call',
        call_from: '+14150000000',
        call_to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
        answer_method: 'GET',
      });

      // Verified against plivo-node lib/resources/call.js: create(from, to, answerUrl, params = {})
      expect(callsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {
        answerMethod: 'GET',
      });
      expect(messagesCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });

    it('omits answerMethod from params when not provided', async () => {
      callsCreate.mockResolvedValue({ requestUuid: 'req-10' });

      await service.run(sourceOptions, {
        operation: 'make_call',
        call_from: '+14150000000',
        call_to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
      });

      expect(callsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {});
    });

    it('treats an empty answer_method as not provided (params stays {})', async () => {
      callsCreate.mockResolvedValue({ requestUuid: 'req-11' });

      await service.run(sourceOptions, {
        operation: 'make_call',
        call_from: '+14150000000',
        call_to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
        answer_method: '',
      });

      expect(callsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {});
    });

    it('throws (and never calls the SDK) when the answer URL is missing', async () => {
      // Guard runs before the try, so the specific message surfaces.
      await expect(
        service.run(sourceOptions, {
          operation: 'make_call',
          call_from: '+14150000000',
          call_to: '+14151111111',
        })
      ).rejects.toMatchObject({ message: 'Answer URL is required' });

      expect(callsCreate).not.toHaveBeenCalled();
    });
  });

  describe('send_whatsapp', () => {
    it('calls messages.create with type:whatsapp for a free-form text message', async () => {
      const sdkResponse = { messageUuid: ['wa-1'], apiId: 'api-3' };
      messagesCreate.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'send_whatsapp',
        wa_from: '+14150000000',
        wa_to: '+14151111111',
        wa_body: 'hi there',
      });

      // Verified against plivo-node lib/resources/messages.js: create(src, dst, text, optionalParams)
      expect(messagesCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'hi there', {
        type: 'whatsapp',
      });
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });

    it('parses the template JSON and passes it through (body defaults to empty string)', async () => {
      messagesCreate.mockResolvedValue({ messageUuid: ['wa-2'] });
      // Shape verified against plivo-node lib/utils/template.js templateSchema.
      const template = { name: 'order_update', language: 'en_US', components: [] };

      await service.run(sourceOptions, {
        operation: 'send_whatsapp',
        wa_from: '+14150000000',
        wa_to: '+14151111111',
        wa_template: JSON.stringify(template),
      });

      expect(messagesCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', '', {
        type: 'whatsapp',
        template,
      });
    });

    it('throws on invalid template JSON (without calling the SDK)', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'send_whatsapp',
          wa_from: '+14150000000',
          wa_to: '+14151111111',
          wa_template: '{ not valid json',
        })
      ).rejects.toMatchObject({ message: 'Query could not be completed' });

      expect(messagesCreate).not.toHaveBeenCalled();
    });

    it('throws when neither body nor template is provided (without calling the SDK)', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'send_whatsapp',
          wa_from: '+14150000000',
          wa_to: '+14151111111',
        })
      ).rejects.toMatchObject({ message: 'Message body or template is required' });

      expect(messagesCreate).not.toHaveBeenCalled();
    });
  });

  describe('lookup_number', () => {
    it('calls lookup.get(number, type) and returns the SDK response', async () => {
      const sdkResponse = { phoneNumber: '+14151111111', country: {}, format: {}, carrier: {} };
      lookupGet.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'lookup_number',
        lookup_number: '+14151111111',
        lookup_type: 'carrier',
      });

      // Verified against plivo-node lib/resources/lookup.js: get(number, type = 'carrier')
      expect(lookupGet).toHaveBeenCalledWith('+14151111111', 'carrier');
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });

    it('passes undefined type when none is provided (SDK applies its default)', async () => {
      lookupGet.mockResolvedValue({ phoneNumber: '+14151111111' });

      await service.run(sourceOptions, {
        operation: 'lookup_number',
        lookup_number: '+14151111111',
      });

      expect(lookupGet).toHaveBeenCalledWith('+14151111111', undefined);
    });

    it('throws (and never calls the SDK) when the number is missing', async () => {
      await expect(
        service.run(sourceOptions, { operation: 'lookup_number' })
      ).rejects.toMatchObject({ message: 'Number is required' });

      expect(lookupGet).not.toHaveBeenCalled();
    });
  });

  it('throws (and never calls the SDK) when a required send_sms field is missing', async () => {
    await expect(
      service.run(sourceOptions, {
        operation: 'send_sms',
        from: '+14150000000',
        to: '+14151111111',
        // body missing
      })
    ).rejects.toMatchObject({ message: 'Body is required' });

    expect(messagesCreate).not.toHaveBeenCalled();
  });

  it('throws on an unknown operation', async () => {
    await expect(service.run(sourceOptions, { operation: 'bogus' })).rejects.toMatchObject({
      message: 'Unknown operation: bogus',
    });
    expect(messagesCreate).not.toHaveBeenCalled();
    expect(callsCreate).not.toHaveBeenCalled();
  });
});
