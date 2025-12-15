# Real-Time Video Chat Application

A full-featured video chat and messaging application built with Next.js 14, standard WebRTC, and Socket.IO. It supports real-time text messaging, one-on-one video calls, and persistent chat history.

## 🚀 Features

- **Real-Time Messaging**: Instant text communication using Socket.IO.
- **Video Calling**: High-quality 1-on-1 video calls via PeerJS (WebRTC).
- **User Authentication**: Secure Signup/Login system with JWT (JSON Web Tokens).
- **Responsive Design**: Mobile-first UI with a Messenger-like experience (Sidebar/Chat toggle).
- **Persistent History**: Chat messages are stored in a PostgreSQL database (Prisma).
- **Interactive UI**:
  - Real-time notifications for incoming calls.
  - "Calling..." status indicators.
  - User presence (Online status simulation).

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Directory)
- **Language**: TypeScript
- **Real-Time Server**: [Socket.IO](https://socket.io/) (Custom Server API)
- **Video/Audio**: [PeerJS](https://peerjs.com/) (WebRTC wrapper)
- **Database**: PostgreSQL (via Supabase or local)
- **ORM**: [Prisma](https://www.prisma.io/)
- **Styling**: Tailwind CSS + Lucide Icons

## 🏗 System Design

The application follows a standard real-time architecture:

1. **Client**: Next.js React Application.
   - Connects to Socket.IO server for signaling and chat.
   - Connects to PeerJS server (public) for WebRTC media streams.
2. **Server**: Next.js API Routes + Custom Socket.IO Server.
   - `/pages/api/socket/io.ts`: Handles WebSocket connections and event broadcasting.
   - `/app/api/*`: REST endpoints for Auth and Message history.
3. **Database**: PostgreSQL.
   - Stores Users and Messages.

### Architecture Diagram
```mermaid
graph TD
    Client[Client (Browser)]
    Server[Next.js Server]
    DB[(PostgreSQL DB)]
    PeerServer[PeerJS Cloud]

    Client -- HTTP Requests --> Server
    Client -- WebSocket (Chat) --> Server
    Client -- WebRTC (Video/Audio) --> Client
    Client -- Signaling --> PeerServer
    Server -- Reads/Writes --> DB
```

## 📊 Database Schema (ERD)

The database consists of two main entities: `User` and `Message`.

```mermaid
erDiagram
    USER ||--o{ MESSAGE : sends
    USER {
        String id PK
        String email UK
        String password
        String name
        DateTime createdAt
        DateTime updatedAt
    }
    MESSAGE {
        String id PK
        String content
        String senderId FK
        String receiverId FK
        DateTime createdAt
    }
```

### Tables

1. **User**
   - `id`: Unique Identifier (UUID)
   - `email`: User email (Unique)
   - `password`: Hashed password
   - `name`: Display name

2. **Message**
   - `id`: Unique Identifier
   - `content`: Text content of the message
   - `senderId`: ID of the user sending the message
   - `receiverId`: ID of the user receiving the message
   - `createdAt`: Timestamp

## ⚡️ Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL Database URL

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd video-chat-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
   JWT_SECRET="your-super-secret-key"
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"
   ```

4. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Access App**
   Open [http://localhost:3000](http://localhost:3000).

---
*Built for educational purposes.*
