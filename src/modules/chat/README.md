# Chat Module

Real-time messaging system using Socket.io and PostgreSQL for persistence.

## Features
*   **Real-time Messaging**: Instant delivery via Socket.io/WebSockets.
*   **Persistence**: Messages are saved to `chat_messages` table.
*   **Conversations**: Grouping messages by `conversation_id`.
*   **File Sharing**: Support for image/file attachments (handled via upload API).

## API Endpoints

### HTTP
*   `POST /api/chat/start` - Start a conversation with a user.
    - Body: `{ job_id, receiver_id }`
*   `GET /api/chat/conversations` - List all conversations.
*   `GET /api/chat/conversations/:id/messages` - Get message history.

## Socket Events

### Client -> Server
*   `join_conversation`: Join a chat room. `{ conversationId }`
*   `send_message`: Send a message. `{ conversationId, content, receiverId }`
*   `typing`: Notify typing status.

### Server -> Client
*   `new_message`: Receive a new message.
*   `notification`: Receive a notification (e.g. new message when not in chat).
