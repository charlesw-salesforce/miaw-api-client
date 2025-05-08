import { createEventSource } from 'eventsource-client';
import { NoopLogger, createError, ErrorType } from './utils.js';

/** @typedef {import('./types.js').Logger} Logger */
/** @typedef {import('./types.js').BaseRequestOptions} BaseRequestOptions */
/** @typedef {import('./types.js').TokenCreateParams} TokenCreateParams */
/** @typedef {import('./types.js').TokenResponse} TokenResponse */
/** @typedef {import('./types.js').ConversationCreateParams} ConversationCreateParams */
/** @typedef {import('./types.js').ConversationCreateResponse} ConversationCreateResponse */
/** @typedef {import('./types.js').SuccessResponse} SuccessResponse */
/** @typedef {import('./types.js').ConversationStatus} ConversationStatus */
/** @typedef {import('./types.js').MessageParams} MessageParams */
/** @typedef {import('./types.js').ConversationEntry} ConversationEntry */
/** @typedef {import('./types.js').ReceiptEntry} ReceiptEntry */
/** @typedef {import('./types.js').ReceiptParams} ReceiptParams */
/** @typedef {import('./types.js').FileUploadParams} FileUploadParams */
/** @typedef {import('./types.js').ConversationListParams} ConversationListParams */
/** @typedef {import('./types.js').ConversationListResponse} ConversationListResponse */
/** @typedef {import('./types.js').SSEOptions} SSEOptions */
/** @typedef {import('./types.js').EventStreamInstance} EventStreamInstance */
/** @typedef {import('./types.js').EventStreamDef} EventStreamDef */
/** @typedef {import('./types.js').MessagingInAppWebConfig} MessagingInAppWebConfig */

const defaultConfig = {
  appName: 'MessagingInAppWebClient',
  timeout: 30000,
  logger: null,
};

/**
 * A client for interacting with the Messaging In-App Web API.
 */
export class MessagingClient {
  /**
   * Creates a new MessagingClient instance.
   * @param {MessagingInAppWebConfig} config - The configuration for the client
   * @throws {Error} If required configuration options are missing
   */
  constructor(config) {
    if (!config?.baseUrl || !config?.orgId || !config?.developerName) {
      throw new Error(
        'Missing required configuration: baseUrl, orgId, and developerName are required'
      );
    }

    this.config = { ...defaultConfig, ...config };
    // Use NoopLogger if no logger is provided
    this.logger = this.config.logger || new NoopLogger();
  }

  /**
   * Creates a new access token.
   * @param {TokenCreateParams} [params] - Optional parameters for token creation
   * @returns {Promise<TokenResponse>}
   */
  async createToken(params = {}) {
    const tokenType =
      params.customerIdentityToken && params.authorizationType
        ? 'authenticated'
        : 'unauthenticated';
    this.logger.debug(`Creating ${tokenType} token`);

    const body = {
      orgId: this.config.orgId,
      esDeveloperName: this.config.developerName,
      capabilitiesVersion: params.capabilitiesVersion || '1',
      platform: params.platform || 'Web',
      context: params.context || {
        appName: this.config.appName,
        clientVersion: '1.0.0',
      },
      ...(params.deviceId && { deviceId: params.deviceId }),
      ...(params.authorizationType && { authorizationType: params.authorizationType }),
      ...(params.customerIdentityToken && { customerIdentityToken: params.customerIdentityToken }),
    };

    const response = await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/authorization/${tokenType}/access-token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      },
      `tokens.create_${tokenType}_token`
    );

    const data = await response.json();
    this.logger.info(`Token created successfully for ${tokenType} flow`);
    return data;
  }

  /**
   * Refreshes an existing access token.
   * @param {string} token - The current access token
   * @returns {Promise<TokenResponse>}
   */
  async refreshToken(token) {
    this.logger.debug('Refreshing token');
    const response = await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/authorization/continuation-access-token`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
      'tokens.refresh'
    );
    const data = await response.json();
    this.logger.info('Token refreshed successfully');
    return data;
  }

  /**
   * Creates a new conversation.
   * @param {string} token - The access token
   * @param {ConversationCreateParams} [params] - Optional parameters for creating the conversation
   * @returns {Promise<ConversationCreateResponse>}
   */
  async createConversation(token, params = {}) {
    const conversationId = params.id || crypto.randomUUID();
    this.logger.debug(`Creating conversation with ID: ${conversationId}`);

    await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: {
          conversationId,
          esDeveloperName: this.config.developerName,
          ...(params.routingAttributes && { routingAttributes: params.routingAttributes }),
        },
      },
      'conversations.create'
    );

    return { id: conversationId };
  }

  /**
   * Closes an existing conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation to close
   * @returns {Promise<SuccessResponse>}
   */
  async closeConversation(token, conversationId) {
    this.logger.debug(`Closing conversation: ${conversationId}`);
    await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}?esDeveloperName=${this.config.developerName}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
      'conversations.close'
    );
    return { success: true };
  }

  /**
   * Ends the current messaging session for a conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation
   * @returns {Promise<SuccessResponse>}
   */
  async endSession(token, conversationId) {
    this.logger.debug(`Ending session for conversation: ${conversationId}`);
    await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}/session?esDeveloperName=${this.config.developerName}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
      'conversations.endSession'
    );
    return { success: true };
  }

  /**
   * Sends a text message to a conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation
   * @param {MessageParams} params - The message parameters
   * @returns {Promise<ConversationEntry[]>}
   * @throws {Error} If message text is not provided
   */
  async sendMessage(token, conversationId, params) {
    if (!params.text) {
      throw new Error('Message text is required');
    }

    const body = {
      message: {
        id: params.id || crypto.randomUUID(),
        messageType: 'StaticContentMessage',
        staticContent: {
          formatType: 'Text',
          text: params.text,
        },
      },
      esDeveloperName: this.config.developerName,
      isNewMessagingSession: params.isNewSession,
      ...(params.routingAttributes && { routingAttributes: params.routingAttributes }),
      ...(params.language && { language: params.language }),
    };

    const response = await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body,
      },
      'conversations.messages.send'
    );

    const data = await response.json();
    return data.conversationEntries.map(entry => ({
      id: entry.id,
      type: 'Message',
      text: params.text,
      timestamp: new Date(entry.clientTimestamp).toISOString(),
      sender: { id: 'user', type: 'endUser' },
    }));
  }

  /**
   * Sends a typing indicator to a conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation
   * @param {boolean} isTyping - Whether to start or stop the typing indicator
   * @returns {Promise<SuccessResponse>}
   */
  async sendTypingIndicator(token, conversationId, isTyping) {
    this.logger.debug(
      `${isTyping ? 'Starting' : 'Stopping'} typing indicator for conversation: ${conversationId}`
    );
    await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}/entry`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          entryType: isTyping ? 'TypingStartedIndicator' : 'TypingStoppedIndicator',
          id: crypto.randomUUID(),
        },
      },
      'conversations.typing'
    );
    return { success: true };
  }

  /**
   * Sends message receipts to a conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation
   * @param {ReceiptParams} params - The receipt parameters
   * @returns {Promise<SuccessResponse>}
   */
  async sendReceipt(token, conversationId, params) {
    this.logger.debug(`Sending receipts for conversation: ${conversationId}`);
    await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}/acknowledge-entries`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: {
          acks: params.entries.map(entry => ({
            id: entry.id,
            entryType: entry.type || 'Delivery',
            conversationEntryId: entry.conversationEntryId,
          })),
        },
      },
      'conversations.receipts.send'
    );
    return { success: true };
  }

  /**
   * Uploads a file to a conversation.
   * @param {string} token - The access token
   * @param {string} conversationId - The ID of the conversation
   * @param {FileUploadParams} params - The file upload parameters
   * @returns {Promise<ConversationEntry[]>}
   * @throws {Error} If file data is not provided or file size exceeds 5MB
   */
  async uploadFile(token, conversationId, params) {
    if (!params.fileData) {
      throw new Error('File data is required');
    }
    if (params.fileData.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit');
    }

    this.logger.debug(`Uploading file to conversation: ${conversationId}`);

    const formData = new FormData();
    const messageEntry = {
      message: {
        id: params.id || crypto.randomUUID(),
        fileId: params.fileId || crypto.randomUUID(),
        text: params.text || '',
        ...(params.inReplyToMessageId && { inReplyToMessageId: params.inReplyToMessageId }),
      },
      isNewMessagingSession: params.isNewSession || false,
      esDeveloperName: this.config.developerName,
      ...(params.routingAttributes && { routingAttributes: params.routingAttributes }),
      ...(params.language && { language: params.language }),
    };

    formData.append(
      'messageEntry',
      new Blob([JSON.stringify(messageEntry)], { type: 'application/json' })
    );
    formData.append(
      'fileData',
      new Blob([params.fileData], { type: params.contentType || params.fileData.type }),
      params.fileName || 'file'
    );

    const response = await this.#makeRequest(
      `${this.config.baseUrl}/iamessage/api/v2/conversation/${conversationId}/file`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
      'conversations.files.upload'
    );

    const data = await response.json();
    return data.conversationEntries.map(entry => ({
      id: entry.id,
      type: 'File',
      text: params.text || '',
      timestamp: new Date(entry.clientTimestamp).toISOString(),
      sender: { id: 'user', type: 'endUser' },
      fileId: params.fileId,
      fileName: params.fileName,
    }));
  }

  /**
   * Creates a Server-Sent Events (SSE) connection.
   * @param {string} token - The access token
   * @param {SSEOptions} options - The SSE connection options
   * @returns {EventStreamInstance} The created EventSource instance
   * @throws {Error} If token is not provided
   */
  createEventStream(token, options) {
    if (!token) {
      throw new Error('Authentication token is required');
    }

    this.logger.debug('Creating EventSource stream connection');

    const eventSource = createEventSource({
      url: `${this.config.baseUrl}/eventrouter/v1/sse`,
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        'X-Org-Id': this.config.orgId,
        ...(options.lastEventId ? { 'Last-Event-Id': options.lastEventId } : {}),
      },
      onConnect: () => {
        this.logger.info('EventSource connection opened');
        options.onOpen?.();
      },
      onDisconnect: () => {
        this.logger.info('SSE disconnected. Preventing auto reconnect.');
        eventSource.close();
      },
      onMessage: options.onEvent,
    });

    return eventSource;
  }

  /**
   * Makes an HTTP request with timeout handling.
   * @private
   * @param {string} url - The URL to request
   * @param {BaseRequestOptions} options - The request options
   * @param {string} operation - The operation name for logging
   * @returns {Promise<Response>}
   */
  async #makeRequest(url, options, operation) {
    const { method, headers, body } = options;
    const controller = new AbortController();
    const timeoutId = this.config.timeout
      ? setTimeout(() => controller.abort(), this.config.timeout)
      : null;

    try {
      const response = await fetch(url, {
        method,
        headers: new Headers(headers),
        body: body instanceof FormData ? body : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let responseBody;
        try {
          responseBody = await response.json();
          // eslint-disable-next-line no-unused-vars
        } catch (_) {
          responseBody = await response.text();
        }
        throw createError(response.status, operation, responseBody);
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout for operation: ${operation}`);
        timeoutError.type = ErrorType.TIMEOUT_ERROR;
        timeoutError.operation = operation;
        this.logger.error(`Request timeout for ${operation}`, timeoutError);
        throw timeoutError;
      }

      this.logger.error(`Error in ${operation}:`, error);
      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
