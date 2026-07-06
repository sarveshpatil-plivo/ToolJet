'use strict';

// Mock the plivo SDK so we can assert how PlivoService calls it, without any network.
const mockMessagesCreate = jest.fn();
const mockCallsCreate = jest.fn();

jest.mock('plivo', () => ({
  Client: jest.fn().mockImplementation((authId, authToken) => ({
    // expose the args the client was constructed with for assertions
    __authId: authId,
    __authToken: authToken,
    messages: { create: mockMessagesCreate },
    calls: { create: mockCallsCreate },
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
      mockMessagesCreate.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'send_sms',
        from: '+14150000000',
        to: '+14151111111',
        body: 'hello',
      });

      expect(plivo.Client).toHaveBeenCalledWith('test-auth-id', 'test-auth-token');
      expect(mockMessagesCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'hello');
      expect(mockCallsCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });
  });

  describe('make_call', () => {
    it('calls calls.create(from, to, answerUrl, params) with the answer method', async () => {
      const sdkResponse = { requestUuid: 'req-9', apiId: 'api-2', message: 'call fired' };
      mockCallsCreate.mockResolvedValue(sdkResponse);

      const result = await service.run(sourceOptions, {
        operation: 'make_call',
        from: '+14150000000',
        to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
        answer_method: 'GET',
      });

      expect(mockCallsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {
        answerMethod: 'GET',
      });
      expect(mockMessagesCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok', data: sdkResponse });
    });

    it('omits answerMethod from params when not provided', async () => {
      mockCallsCreate.mockResolvedValue({ requestUuid: 'req-10' });

      await service.run(sourceOptions, {
        operation: 'make_call',
        from: '+14150000000',
        to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
      });

      expect(mockCallsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {});
    });

    it('treats an empty answer_method as not provided (params stays {})', async () => {
      mockCallsCreate.mockResolvedValue({ requestUuid: 'req-11' });

      await service.run(sourceOptions, {
        operation: 'make_call',
        from: '+14150000000',
        to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
        answer_method: '',
      });

      expect(mockCallsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {});
    });

    it('normalizes a lowercase answer_method to upper case', async () => {
      mockCallsCreate.mockResolvedValue({ requestUuid: 'req-12' });

      await service.run(sourceOptions, {
        operation: 'make_call',
        from: '+14150000000',
        to: '+14151111111',
        answer_url: 'https://example.com/answer.xml',
        answer_method: 'post',
      });

      expect(mockCallsCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', 'https://example.com/answer.xml', {
        answerMethod: 'POST',
      });
    });

    it('throws (and never calls the SDK) on an invalid answer_method', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'make_call',
          from: '+14150000000',
          to: '+14151111111',
          answer_url: 'https://example.com/answer.xml',
          answer_method: 'PUT',
        })
      ).rejects.toMatchObject({ message: 'Answer Method must be GET or POST' });

      expect(mockCallsCreate).not.toHaveBeenCalled();
    });

    it('throws the specific message (not the SDK) when a required field is whitespace-only', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'make_call',
          from: '   ',
          to: '+14151111111',
          answer_url: 'https://example.com/answer.xml',
        })
      ).rejects.toMatchObject({ message: 'From Number is required' });

      expect(mockCallsCreate).not.toHaveBeenCalled();
    });

    it('throws (and never calls the SDK) when the answer URL is missing', async () => {
      // Guard runs before the try, so the specific message surfaces.
      await expect(
        service.run(sourceOptions, {
          operation: 'make_call',
          from: '+14150000000',
          to: '+14151111111',
        })
      ).rejects.toMatchObject({ message: 'Answer URL is required' });

      expect(mockCallsCreate).not.toHaveBeenCalled();
    });
  });

  describe('send_sms validation', () => {
    it('throws (and never calls the SDK) when a required field is missing', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'send_sms',
          from: '+14150000000',
          to: '+14151111111',
          // body missing
        })
      ).rejects.toMatchObject({ message: 'Body is required' });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it('throws the specific message when a required field is whitespace-only', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'send_sms',
          from: '   ',
          to: '+14151111111',
          body: 'hi',
        })
      ).rejects.toMatchObject({ message: 'From Number is required' });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it("accepts a string '0' body (truthy after trim)", async () => {
      mockMessagesCreate.mockResolvedValue({ messageUuid: ['z-1'] });

      await service.run(sourceOptions, {
        operation: 'send_sms',
        from: '+14150000000',
        to: '+14151111111',
        body: '0',
      });

      expect(mockMessagesCreate).toHaveBeenCalledWith('+14150000000', '+14151111111', '0');
    });

    it('rejects a non-string field with the clean message (no TypeError) and never calls the SDK', async () => {
      // Regression: optional chaining (from?.trim()) would throw a raw TypeError
      // on a non-string before the try, escaping unwrapped. The typeof guard
      // rejects it cleanly instead.
      await expect(
        service.run(sourceOptions, {
          operation: 'send_sms',
          from: 0,
          to: '+14151111111',
          body: 'hi',
        })
      ).rejects.toMatchObject({ message: 'From Number is required' });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it('rejects a numeric body as missing (body is treated as a string)', async () => {
      await expect(
        service.run(sourceOptions, {
          operation: 'send_sms',
          from: '+14150000000',
          to: '+14151111111',
          body: 0,
        })
      ).rejects.toMatchObject({ message: 'Body is required' });

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });
  });

  it('throws when credentials are missing (without constructing a client)', async () => {
    await expect(
      service.run({ authId: '', authToken: '' }, { operation: 'send_sms', from: 'a', to: 'b', body: 'c' })
    ).rejects.toMatchObject({ message: 'Plivo Auth ID and Auth Token are required' });

    expect(plivo.Client).not.toHaveBeenCalled();
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  describe('error handling', () => {
    it("forwards PlivoRestError's structured fields into the QueryError data", async () => {
      // Field names verified against node_modules/plivo/dist/utils/restException.js:
      // PlivoRestError sets .status, .statusText, .message, .apiID, .moreInfo.
      const plivoError = Object.assign(new Error('Invalid phone number'), {
        name: 'PlivoRestError',
        status: 400,
        statusText: 'Bad Request',
        apiID: 'abc-api-id',
        moreInfo: 'from=invalid',
      });
      mockCallsCreate.mockRejectedValue(plivoError);

      await expect(
        service.run(sourceOptions, {
          operation: 'make_call',
          from: '+14150000000',
          to: '+14151111111',
          answer_url: 'https://example.com/answer.xml',
        })
      ).rejects.toMatchObject({
        message: 'Query could not be completed',
        description: 'Invalid phone number',
        data: {
          name: 'PlivoRestError',
          message: 'Invalid phone number',
          status: 400,
          statusText: 'Bad Request',
          apiId: 'abc-api-id',
          moreInfo: 'from=invalid',
        },
      });
    });

    it('falls back to the error name when message is absent', async () => {
      const errNoMessage = Object.assign(new Error(), { name: 'AuthenticationError', status: 401 });
      // Ensure message really is empty (Error('') gives '').
      mockMessagesCreate.mockRejectedValue(errNoMessage);

      await expect(
        service.run(sourceOptions, { operation: 'send_sms', from: '+14150000000', to: '+14151111111', body: 'hi' })
      ).rejects.toMatchObject({
        description: 'AuthenticationError',
        data: { name: 'AuthenticationError', message: 'AuthenticationError', status: 401 },
      });
    });
  });

  // An unknown operation is rejected by the pre-try validation switch. The inner
  // (in-try) switch also has a `default` backstop so a future validated-but-
  // unimplemented op fails loudly instead of returning empty data; that path is
  // unreachable via the public API while both switches stay in sync.
  it('throws on an unknown operation', async () => {
    await expect(service.run(sourceOptions, { operation: 'bogus' })).rejects.toMatchObject({
      message: 'Unknown operation: bogus',
    });
    expect(mockMessagesCreate).not.toHaveBeenCalled();
    expect(mockCallsCreate).not.toHaveBeenCalled();
  });
});
