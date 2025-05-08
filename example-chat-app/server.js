import fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { MessagingClient } from 'miaw-api-client';
import dotenv from 'dotenv';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configure Pino logger
const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
  level: 'debug',
});

const app = fastify({
  loggerInstance: logger,
  bodyLimit: 10 * 1024 * 1024, // 10MB limit
});

// Initialize MIAW client
const client = new MessagingClient({
  baseUrl: process.env.BASE_URL,
  orgId: process.env.ORG_ID,
  developerName: process.env.DEVELOPER_NAME,
  logger,
});

// Store active conversations
const conversations = new Map();

// Helper function to get a conversation from the in-memory store
function getConversation(conversationId) {
  const conversation = conversations.get(conversationId);
  if (!conversation) {
    throw new Error('Conversation not found');
  }
  return conversation;
}

// Register plugins
await app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/',
  decorateReply: true,
});

await app.register(fastifyMultipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  sharedSchemaId: '#MultipartFileType',
  throwFileSizeLimit: true,
});

// Serve index.html
app.get('/', async (request, reply) => {
  return reply.sendFile('index.html');
});

// Initialize chat session
app.post('/api/chat/init', async () => {
  const { accessToken } = await client.createToken();
  const { id: conversationId } = await client.createConversation(accessToken);

  // Store the token and conversation ID
  conversations.set(conversationId, { accessToken });

  return { conversationId };
});

// Send message
app.post('/api/chat/send', async (request, reply) => {
  try {
    const parts = request.parts();
    let conversationId;
    let text;
    let fileData;

    for await (const part of parts) {
      if (part.type === 'field') {
        if (part.fieldname === 'conversationId') {
          conversationId = part.value;
        } else if (part.fieldname === 'text') {
          text = part.value;
        }
      } else if (part.type === 'file') {
        const buffer = await part.toBuffer();
        fileData = {
          fileName: part.filename,
          fileSize: buffer.length,
          fileData: new Blob([buffer], { type: part.mimetype || 'application/octet-stream' }),
        };
      }
    }

    if (!conversationId) {
      throw new Error('Missing conversationId');
    }

    const conversation = await getConversation(conversationId);
    let messageEntry;

    if (fileData) {
      messageEntry = await client.uploadFile(conversation.accessToken, conversationId, {
        fileData: fileData.fileData,
        fileName: fileData.fileName,
        text: text || '',
        contentType: fileData.fileData.type,
      });
    } else if (text) {
      messageEntry = await client.sendMessage(conversation.accessToken, conversationId, { text });
    }

    return messageEntry;
  } catch (error) {
    console.error('Error sending message:', error);
    reply.status(500).send({ error: error.message });
  }
});

// Stream events (SSE endpoint)
app.get('/api/chat/events/:conversationId', async (request, reply) => {
  const { conversationId } = request.params;
  const conversation = await getConversation(conversationId);

  // Set headers for SSE
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Set up event stream
  const eventStream = client.createEventStream(conversation.accessToken, {
    lastEventId: '0',
    onEvent: event => {
      try {
        // Send the raw event data
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    },
    onError: error => {
      console.error('Stream error:', error);
      reply.raw.end();
    },
  });

  // Clean up on connection close
  request.raw.on('close', () => {
    if (eventStream) {
      eventStream.close();
    }
  });
});

// Close conversation
app.post('/api/chat/close', async request => {
  const { conversationId } = request.body;
  const conversation = await getConversation(conversationId);

  // Close the conversation
  await client.closeConversation(conversation.accessToken, conversationId);

  // Remove the conversation from our store
  conversations.delete(conversationId);

  return { success: true };
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
