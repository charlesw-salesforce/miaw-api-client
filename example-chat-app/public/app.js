// This example uses Alpine.js to manage the state and interactivity of the chat app
function chatApp() {
  return {
    // State
    conversationId: null,
    eventSource: null,
    isChatActive: false,
    isConnecting: false,
    error: false,
    statusText: 'Not Connected',
    messageText: '',
    selectedFile: null,
    fileError: '',
    messages: [],
    typingIndicator: false,

    // Initialize the app
    init() {
      this.initChat();
    },

    // Initialize the conversation (chat)
    async initChat() {
      try {
        this.isConnecting = true;
        this.statusText = 'Connecting...';
        this.error = false;

        const response = await fetch('/api/chat/init', { method: 'POST' });
        const data = await response.json();
        this.conversationId = data.conversationId;
        this.isChatActive = true;
        this.connectToEventStream();

        // Clear previous messages when starting a new chat
        this.messages = [];
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        this.handleChatError('Failed to connect');
      } finally {
        this.isConnecting = false;
      }
    },

    // Connect to the conversation event stream
    connectToEventStream() {
      if (!this.conversationId) return;

      this.eventSource = new EventSource(`/api/chat/events/${this.conversationId}`);

      this.eventSource.onmessage = event => {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      };

      this.eventSource.onerror = error => {
        console.error('EventSource error:', error);
        this.handleChatError('Connection lost');
      };
    },

    // Send a message to the conversation
    async sendMessage() {
      if (!this.canSendMessage || !this.conversationId) return;

      try {
        const formData = new FormData();
        formData.append('conversationId', this.conversationId);
        if (this.messageText) {
          formData.append('text', this.messageText);
        }
        if (this.selectedFile) {
          formData.append('file', this.selectedFile);
        }

        await fetch('/api/chat/send', {
          method: 'POST',
          body: formData,
        });

        this.messageText = '';
        this.resetFileInput();
        this.fileError = '';
      } catch (error) {
        console.error('Failed to send message:', error);
        this.handleChatError('Failed to send message');
      }
    },

    // Get chat transcript
    async getTranscript() {
      // Implementation for getting transcript would go here
      alert('Transcript request functionality would be implemented here');
    },

    // Close the conversation (chat)
    async closeChat() {
      if (!this.conversationId) return;

      try {
        await fetch('/api/chat/close', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ conversationId: this.conversationId }),
        });

        // Close EventSource connection
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        this.isChatActive = false;
        this.statusText = 'Not Connected';
        this.addMessage({
          id: Date.now(),
          type: 'system',
          text: 'Chat session has ended',
        });
        this.resetFileInput();
        this.messageText = '';
      } catch (error) {
        console.error('Failed to close chat:', error);
        this.handleChatError('Failed to end chat');
      }
    },

    // Handle an event from the conversation event stream
    handleEvent(event) {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      switch (event.event) {
        case 'CONVERSATION_MESSAGE':
          this.handleMessage(data);
          break;
        case 'CONVERSATION_ROUTING_RESULT':
        case 'CONVERSATION_ROUTING_WORK_RESULT':
          this.handleRoutingResult(data);
          break;
        case 'CONVERSATION_PARTICIPANT_CHANGED':
          this.handleParticipantChange(data);
          break;
        case 'CONVERSATION_TYPING_STARTED_INDICATOR':
          this.handleTypingStarted(data);
          break;
        case 'CONVERSATION_TYPING_STOPPED_INDICATOR':
          this.handleTypingStopped(data);
          break;
      }
    },

    // Handle a message from the conversation event stream
    handleMessage(data) {
      const entry = data.conversationEntry;
      const payload =
        typeof entry.entryPayload === 'string'
          ? JSON.parse(entry.entryPayload)
          : entry.entryPayload;

      this.typingIndicator = false;

      if (payload.abstractMessage?.staticContent) {
        const content = payload.abstractMessage.staticContent;
        const messageType = this.getMessageType(entry.sender.role);

        if (content.formatType === 'Attachments' && content.attachments?.length > 0) {
          // Handle messages with attachments
          const message = {
            id: Date.now(),
            type: messageType,
            text: content.text || '',
            attachments: content.attachments.map(attachment => ({
              name: attachment.name,
              type: attachment.mimeType,
              icon: this.getFileIcon(attachment),
            })),
          };
          this.addMessage(message);
        } else if (content.text) {
          // Handle text-only messages
          this.addMessage({
            id: Date.now(),
            type: messageType,
            text: content.text,
          });
        }
      }
    },

    // Handle a typing started event from the conversation event stream
    handleTypingStarted(data) {
      const entry = data.conversationEntry;
      if (entry.sender.role.toLowerCase() === 'chatbot') {
        this.typingIndicator = true;
        this.$nextTick(() => this.scrollToBottom());
      }
    },

    // Handle a typing stopped event from the conversation event stream
    handleTypingStopped(data) {
      const entry = data.conversationEntry;
      if (entry.sender.role.toLowerCase() === 'chatbot') {
        this.typingIndicator = false;
      }
    },

    // Handle a routing result event from the conversation event stream
    handleRoutingResult(data) {
      const payload = data.conversationEntry.entryPayload;

      if (payload.errorMessages?.length > 0) {
        this.addMessage({
          id: Date.now(),
          type: 'system',
          text: 'Unable to connect to an agent: ' + payload.errorMessages.join(', '),
        });
        return;
      }

      if (payload.routingType === 'Initial' && payload.failureType === 'None') {
        const waitTime = payload.estimatedWaitTime.estimatedWaitTimeInSeconds;
        let waitMessage = 'Connecting you to an agent...';

        if (waitTime > 0) {
          const minutes = Math.ceil(waitTime / 60);
          waitMessage += ` Estimated wait time: ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        }

        this.addMessage({
          id: Date.now(),
          type: 'system',
          text: waitMessage,
        });
      }
    },

    // Handle a participant change event from the conversation event stream
    handleParticipantChange(data) {
      const entry = data.conversationEntry;
      const payload =
        typeof entry.entryPayload === 'string'
          ? JSON.parse(entry.entryPayload)
          : entry.entryPayload;

      if (payload.entries) {
        payload.entries.forEach(entry => {
          if (entry.operation === 'add' && entry.participant.role.toLowerCase() === 'chatbot') {
            const agentName = entry.displayName || 'An agent';
            this.statusText = `Connected to ${agentName}`;
            this.addMessage({
              id: Date.now(),
              type: 'system',
              text: `${agentName} has joined the chat`,
            });
          }
          if (entry.operation === 'remove' && entry.participant.role.toLowerCase() === 'chatbot') {
            const agentName = entry.participant.displayName || 'An agent';
            this.addMessage({
              id: Date.now(),
              type: 'system',
              text: `${agentName} has left the chat`,
            });
          }
        });
      }
    },

    // Handle an error from the conversation event stream
    handleChatError(message) {
      this.isChatActive = false;
      this.error = true;
      this.statusText = message;

      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }

      this.conversationId = null;
    },

    // Helpers
    getMessageType(senderRole) {
      const role = senderRole.toLowerCase();
      if (role === 'enduser') return 'sent';
      if (role === 'bot' || role === 'chatbot') return 'received bot';
      return 'received';
    },

    addMessage(message) {
      this.messages.push(message);
      this.$nextTick(() => this.scrollToBottom());
    },

    scrollToBottom() {
      if (this.$refs.messages) {
        this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
      }
    },

    getFileIcon(file) {
      const fileName = file.name.toLowerCase();
      if (file.mimeType?.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|tiff)$/)) {
        return '🖼️';
      }
      if (file.mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return '📄';
      }
      if (
        file.mimeType?.includes('excel') ||
        file.mimeType?.includes('spreadsheet') ||
        fileName.match(/\.(xls|xlsx|csv)$/)
      ) {
        return '📊';
      }
      if (
        file.mimeType?.includes('word') ||
        file.mimeType?.includes('document') ||
        fileName.match(/\.(doc|docx)$/)
      ) {
        return '📝';
      }
      return '📎';
    },

    handleFileSelect(event) {
      const file = event.target.files[0];
      this.fileError = '';

      if (file) {
        const validTypes = [
          'image/bmp',
          'image/gif',
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/tiff',
          'application/pdf',
          'application/csv',
          'application/doc',
          'application/xml',
          'application/vnd.ms-excel',
        ];

        if (!validTypes.includes(file.type)) {
          this.fileError = 'File type not supported';
          this.$refs.fileInput.value = '';
          return;
        }

        this.selectedFile = file;
      } else {
        this.selectedFile = null;
      }
    },

    resetFileInput() {
      this.selectedFile = null;
      this.$refs.fileInput.value = '';
    },

    // Computed properties
    get canSendMessage() {
      return this.isChatActive && (this.messageText || this.selectedFile);
    },
  };
}
