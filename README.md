# Messaging for In-App and Web Client

A TypeScript client library for Salesforce's [Messaging for In-App and Web](https://developer.salesforce.com/docs/service/messaging-api/overview) APIs.

This is a personal project and not an official Salesforce product. It is not officially supported by Salesforce.

## Features

- TypeScript support with full type definitions
- Token management for both authenticated and unauthenticated sessions
- Conversation management (create, close, end sessions)
- Real-time messaging with Server-Sent Events (SSE)
- Typing indicators
- Message receipts (delivery and read receipts)
- File upload support (up to 5MB)
- Logging support
- Request timeout handling

## Installation

This project uses [npm](https://www.npmjs.com/) as its package manager.

```bash
npm install miaw-api-client
```

## Quick Start

```typescript
import { MessagingClient } from 'miaw-api-client';

// Initialize the client
const client = new MessagingClient({
  baseUrl: 'YOUR_BASE_URL',
  orgId: 'YOUR_ORG_ID',
  developerName: 'YOUR_DEVELOPER_NAME',
  // Optional: Custom logger
  logger: console,
  // Optional: Default request timeout in milliseconds
  timeout: 30000,
});

// Create a token
const { accessToken, lastEventId } = await client.createToken();

// Create a conversation
const { id: conversationId } = await client.createConversation(accessToken);

// Send a message
const messageEntries = await client.sendMessage(accessToken, conversationId, {
  text: 'Hello, world!',
});

// Stream conversation events
const eventStream = client.createEventStream(accessToken, {
  lastEventId: lastEventId || '0',
  onEvent: event => {
    console.log('Received event:', event);
  },
  onOpen: () => {
    console.log('Connection opened');
  },
  onError: error => {
    console.error('Stream error:', error);
  },
});

// Send typing indicator
await client.sendTypingIndicator(accessToken, conversationId, true);

// Send a file
const fileEntries = await client.uploadFile(accessToken, conversationId, {
  fileData: new Blob(['Hello World'], { type: 'text/plain' }),
  fileName: 'hello.txt',
  text: 'Here is a file for you!',
});

// Send delivery receipts
await client.sendReceipt(accessToken, conversationId, {
  entries: [
    {
      type: 'Delivery',
      conversationEntryId: 'MESSAGE_ID',
    },
  ],
});

// End session or close conversation
await client.endSession(accessToken, conversationId);
// or
await client.closeConversation(accessToken, conversationId);

// Later, when you need to clean up:
if (eventStream) {
  eventStream.close();
}
```

## API Reference

### Configuration

```typescript
interface MessagingInAppWebConfig {
  baseUrl: string; // Required: Custom Client instance URL
  orgId: string; // Required: Salesforce organization ID
  developerName: string; // Required: Custom Client developer name
  logger?: Logger; // Optional: Custom logger implementation
  appName?: string; // Application name (defaults to 'MessagingInAppWebClient')
  timeout?: number; // Optional: Default request timeout in milliseconds (defaults to 30000)
}
```

### Token Methods

#### `createToken(params?)`

Creates a new access token for interacting with the messaging API.

```typescript
interface TokenCreateParams {
  capabilitiesVersion?: string; // API capabilities version (defaults to '1')
  platform?: 'Web' | 'Mobile'; // Platform type (defaults to 'Web')
  deviceId?: string; // Unique device identifier
  context?: {
    appName: string; // Application name (defaults to 'MessagingInAppWebClient')
    clientVersion: string; // Client version (defaults to '1.0.0')
  };
  authorizationType?: string; // Required for authenticated sessions
  customerIdentityToken?: string; // Required for authenticated sessions
}

const { accessToken, lastEventId } = await client.createToken(params);
```

#### `refreshToken(token)`

Refreshes an existing access token.

```typescript
const { accessToken, lastEventId } = await client.refreshToken(token);
```

### Conversation Methods

#### `createConversation(token, params?)`

Creates a new conversation with optional routing attributes.

```typescript
interface ConversationCreateParams {
  id?: string; // Optional custom ID for the conversation
  routingAttributes?: Record<string, unknown>; // Optional routing parameters
}

const { id } = await client.createConversation(token, params);
```

#### `closeConversation(token, conversationId)`

Closes an existing conversation.

```typescript
const { success } = await client.closeConversation(token, conversationId);
```

#### `endSession(token, conversationId)`

Ends the current messaging session for a conversation while keeping the conversation open.

```typescript
const { success } = await client.endSession(token, conversationId);
```

### Message Methods

#### `sendMessage(token, conversationId, params)`

Sends a text message to a conversation.

```typescript
interface MessageParams {
  text: string; // Required: Message content
  id?: string; // Optional: Custom message ID
  isNewSession?: boolean; // Optional: Start a new messaging session
  routingAttributes?: Record<string, unknown>; // Optional: Custom routing parameters
  language?: string; // Optional: Message language code
}

const entries = await client.sendMessage(token, conversationId, params);
```

#### `sendTypingIndicator(token, conversationId, isTyping)`

Sends a typing indicator to a conversation.

```typescript
// Start typing
await client.sendTypingIndicator(token, conversationId, true);

// Stop typing
await client.sendTypingIndicator(token, conversationId, false);
```

#### `sendReceipt(token, conversationId, params)`

Sends message receipts to a conversation.

```typescript
interface ReceiptParams {
  entries: {
    id?: string; // Optional custom ID for the receipt
    type?: 'Delivery' | 'Read'; // Type of receipt (defaults to 'Delivery')
    conversationEntryId: string; // The message ID being acknowledged
  }[];
}

await client.sendReceipt(token, conversationId, params);
```

### File Upload

#### `uploadFile(token, conversationId, params)`

Uploads a file to a conversation (max 5MB).

```typescript
interface FileUploadParams {
  fileData: Blob; // Required: The file data as a Blob
  id?: string; // Optional: Custom message ID
  fileId?: string; // Optional: Custom file ID
  text?: string; // Optional: Message text accompanying the file
  fileName?: string; // Optional: File name
  contentType?: string; // Optional: Content type of the file
  inReplyToMessageId?: string; // Optional: Message ID this file is in reply to
  routingAttributes?: Record<string, string>; // Optional: Custom routing parameters
  isNewSession?: boolean; // Optional: Start a new messaging session
  language?: string; // Optional: Message language code
}

const entries = await client.uploadFile(token, conversationId, params);
```

### Event Streaming

#### `createEventStream(token, options)`

Creates a Server-Sent Events (SSE) connection to receive real-time updates.

```typescript
interface SSEOptions {
  lastEventId?: string; // The last event ID received, for resuming the stream
  onEvent: (event: MessageEvent) => void; // Callback for each message/event received
  onOpen?: () => void; // Callback for when the connection is successfully opened
  onError?: (event: Event) => void; // Callback for any error on the EventSource
}

const eventStream = client.createEventStream(token, options);

// To close the stream later:
eventStream.close();
```

## Error Handling

The client includes built-in error handling with typed errors. Each error contains a type, operation, and additional details.

```typescript
try {
  await client.sendMessage(token, conversationId, { text: 'Hello' });
} catch (error) {
  console.error(`Error type: ${error.type}`);
  console.error(`Operation: ${error.operation}`);
  console.error(`Status code: ${error.statusCode}`);
  console.error(`Details: ${error.details}`);
}
```

Error types:

- `invalid_request_error`
- `authentication_error`
- `permission_error`
- `not_found_error`
- `conflict_error`
- `rate_limit_error`
- `api_error`
- `timeout_error`
- `unknown_error`
