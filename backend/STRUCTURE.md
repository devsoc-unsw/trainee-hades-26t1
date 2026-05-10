# Backend Structure

## Directory Organization

```
src/
├── index.ts              # Entry point - server setup and initialization
├── config/
│   └── supabase.ts       # Supabase client configuration
├── routes/
│   ├── auth.ts           # Authentication endpoints (register, signin)
│   └── test.ts           # Health check and test endpoints
├── sockets/
│   └── handlers.ts       # Socket.IO event handlers
└── types/
    └── index.ts          # TypeScript type definitions
```

## Key Features

- **Modular Architecture**: Each concern is separated into its own file/folder
- **Configuration Management**: Environment variables centralized in config/
- **Route Organization**: API endpoints organized by feature in routes/
- **Socket Handler**: Real-time communication handlers in sockets/
- **Type Safety**: TypeScript types in types/ for better development experience

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User sign in
- `GET /api/test/health` - Health check with Supabase connection test

## Environment Variables

Make sure to set these in your `.env` file:
- `PORT` - Server port (default: 3000)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `FRONTEND_URL` - Frontend URL for CORS (default: http://localhost:3000)
