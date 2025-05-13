# MIAW Client Example Chat App

A simple example application demonstrating how to use the MIAW Client library in a real-world chat application. This example implements a full-stack chat application with real-time messaging, file uploads, and conversation management.

## Prerequisites

- Node.js 18 or higher
- npm
- A MIAW API account with valid credentials

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MIAW API Configuration
BASE_URL=<your-miaw-api-base-url>
ORG_ID=<your-organization-id>
DEVELOPER_NAME=<your-developer-name>
```

## Getting Started

1. Install dependencies:

```bash
cd example-chat-app
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Start the production server:

```bash
npm start
```

The server will start on port 3000. Open `http://localhost:3000` in your browser to access the chat interface.

## API Endpoints

### Chat Session Management

#### Initialize Chat Session

- **POST** `/api/chat/init`
- **Response**: `{ conversationId: string }`
- Creates a new chat session and returns a conversation ID

#### Close Chat Session

- **POST** `/api/chat/close`
- **Body**: `{ conversationId: string }`
- **Response**: `{ success: boolean }`
- Closes an active chat session

### Messaging

#### Send Message

- **POST** `/api/chat/send`
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `conversationId` (required): string
  - `text` (optional): string
  - `file` (optional): file upload
- **Response**: Message entry object

#### Stream Events

- **GET** `/api/chat/events/:conversationId`
- **Headers**:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- Server-Sent Events endpoint for real-time updates

## License

ISC
