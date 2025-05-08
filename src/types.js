/**
 * @typedef {object} Logger
 * @property {(message?: any, ...optionalParams: any[]) => void} log
 * @property {(message?: any, ...optionalParams: any[]) => void} error
 * @property {(message?: any, ...optionalParams: any[]) => void} warn
 * @property {(message?: any, ...optionalParams: any[]) => void} info
 * @property {(message?: any, ...optionalParams: any[]) => void} debug
 */

/**
 * @typedef {object} BaseRequestOptions
 * @property {'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'} method - The HTTP method.
 * @property {Record<string, string>} [headers] - The request headers.
 * @property {string | Record<string, any> | FormData} [body] - The request body.
 * @property {number} [timeout] - The request timeout in milliseconds.
 */

/**
 * @typedef {object} TokenCreateParams
 * @property {string} [capabilitiesVersion] - API capabilities version (defaults to '1')
 * @property {'Web' | 'Mobile'} [platform] - Platform type (defaults to 'Web')
 * @property {string} [deviceId] - Unique device identifier
 * @property {object} [context]
 * @property {string} [context.appName] - Application name
 * @property {string} [context.clientVersion] - Client version (defaults to '1.0.0')
 * @property {string} [authorizationType] - Required for authenticated sessions
 * @property {string} [customerIdentityToken] - Required for authenticated sessions
 */

/**
 * @typedef {object} TokenResponse
 * @property {string} accessToken
 * @property {string} lastEventId
 */

/**
 * @typedef {object} ConversationCreateParams
 * @property {string} [id] - Optional custom ID for the conversation.
 * @property {Record<string, unknown>} [routingAttributes] - Optional: Custom routing parameters
 */

/**
 * @typedef {object} ConversationCreateResponse
 * @property {string} id - The ID of the created conversation.
 */

/**
 * @typedef {object} SuccessResponse
 * @property {boolean} success
 */

/**
 * @typedef {object} ConversationStatus
 * @property {string} id
 * @property {string} status
 * @property {string} lastActivityTimestamp
 * @property {boolean} isActive
 */

/**
 * @typedef {object} MessageParams
 * @property {string} text - Required: Message content
 * @property {string} [id] - Optional: Custom message ID
 * @property {boolean} [isNewSession] - Optional: Start a new messaging session
 * @property {Record<string, unknown>} [routingAttributes] - Optional: Custom routing parameters
 * @property {string} [language] - Optional: Message language code
 */

/**
 * @typedef {object} ConversationEntry
 * @property {string} id
 * @property {string} type
 * @property {string} [text]
 * @property {string} timestamp
 * @property {object} sender
 * @property {string} sender.id
 * @property {string} sender.type
 * @property {string} [fileId] - Optional: ID of the file if the entry is a file
 * @property {string} [fileName] - Optional: Name of the file if the entry is a file
 */

/**
 * @typedef {object} ReceiptEntry
 * @property {string} [id] - Optional custom ID for the receipt entry.
 * @property {'Delivery' | 'Read'} [type] - Type of receipt.
 * @property {string} conversationEntryId - The ID of the conversation entry being acknowledged.
 */

/**
 * @typedef {object} ReceiptParams
 * @property {ReceiptEntry[]} entries - Array of receipt entries.
 */

/**
 * @typedef {object} FileUploadParams
 * @property {Blob} fileData - Required: The file data as a Blob.
 * @property {string} [id] - Optional: Custom message ID.
 * @property {string} [fileId] - Optional: Custom file ID.
 * @property {string} [text] - Optional: Message text accompanying the file.
 * @property {string} [inReplyToMessageId] - Optional: Message ID this file is in reply to.
 * @property {Record<string, string>} [routingAttributes] - Optional: Custom routing parameters.
 * @property {boolean} [isNewSession] - Optional: Start a new messaging session.
 * @property {string} [language] - Optional: Message language code.
 * @property {string} [fileName] - Optional: File name.
 * @property {string} [contentType] - Optional: Content type of the file.
 */

/**
 * @typedef {object} ConversationListParams
 * @property {number} [limit]
 * @property {string} [startTimestamp]
 * @property {string} [endTimestamp]
 * @property {'asc' | 'desc'} [direction]
 * @property {string[]} [entryTypeFilter]
 */

/**
 * @typedef {object} ConversationListResponse
 * @property {string} id
 * @property {ConversationEntry[]} entries
 */

/**
 * @typedef {object} SSEOptions
 * @property {string} [lastEventId] - The last event ID received, for resuming the stream.
 * @property {(event: MessageEvent) => void} onEvent - Callback for each message/event received.
 * @property {() => void} [onOpen] - Callback for when the connection is successfully opened.
 * @property {(event: Event) => void} [onError] - Callback for any error on the EventSource.
 */

/**
 * @typedef {EventSource} EventStreamInstance
 */

/**
 * @typedef {object} EventStreamDef
 * @property {() => void} close - Method to close the event stream
 */

/**
 * @typedef {object} MessagingInAppWebConfig
 * @property {string} baseUrl - Required: Custom Client instance URL
 * @property {string} orgId - Required: Salesforce organization ID
 * @property {string} developerName - Required: Custom Client developer name
 * @property {Logger} [logger] - Optional: Custom logger implementation (defaults to no logging)
 * @property {string} [appName] - Application name (defaults to 'MessagingInAppWebClient')
 * @property {number} [timeout] - Optional: Default request timeout for all API calls.
 */

export const types = {};
