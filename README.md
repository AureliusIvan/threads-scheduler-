# Threads Scheduler

A production-ready Threads scheduling application built with Next.js 15, TypeScript, Supabase, and TailwindCSS. Schedule, manage, and analyze your Threads content with a powerful, modern interface.

## 🚀 Features

### Core Features
- **Meta OAuth Authentication** - Secure login with Threads API access
- **Rich Text Editor** - TipTap-powered editor with markdown support, character counting, and auto-save
- **Calendar Scheduling** - Drag-and-drop calendar interface with timezone support
- **Media Management** - Upload and manage images/videos (2MB max) with storage optimization
- **Analytics Dashboard** - Real-time engagement metrics, best posting times, and performance insights
- **Queue Management** - Background processing with retry logic and error handling

### Technical Features
- **Next.js 15** with App Router and React 19
- **TypeScript 5.x** for type safety
- **Supabase** for database, auth, and storage
- **TailwindCSS 4.x** for styling
- **Rate Limiting** and security middleware
- **Comprehensive Testing** (80% coverage target)
- **Docker Support** for containerized deployment
- **CI/CD Ready** with GitHub Actions

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Supabase account and project
- Meta Developer account with Threads API access
- Git

## 🛠 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/threads-scheduler.git
cd threads-scheduler
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Configure your environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Meta OAuth Configuration
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_key

# Optional: Database URL for local development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/threads_scheduler
```

### 4. Database Setup

Run Supabase migrations:

```bash
# Start Supabase locally (optional)
npx supabase start

# Apply migrations
npx supabase db push
```

### 5. Start Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🏗 Project Structure

```
threads-scheduler/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── posts/         # Post management
│   │   │   ├── analytics/     # Analytics endpoints
│   │   │   ├── media/         # File upload
│   │   │   └── scheduler/     # Queue management
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── layout/           # Layout components
│   │   └── charts/           # Analytics charts
│   ├── lib/                  # Utilities and configurations
│   │   ├── auth.ts           # Authentication logic
│   │   ├── supabase.ts       # Supabase client
│   │   └── threads-api.ts    # Threads API client
│   ├── types/                # TypeScript type definitions
│   │   ├── database.ts       # Database types
│   │   └── threads.ts        # Threads API types
│   ├── hooks/                # Custom React hooks
│   ├── utils/                # Utility functions
│   └── middleware.ts         # Next.js middleware
├── supabase/
│   ├── config.toml           # Supabase configuration
│   └── migrations/           # Database migrations
├── tests/                    # Test files
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
├── docs/                     # Documentation
├── Dockerfile                # Production container
├── docker-compose.yml        # Development environment
└── package.json
```

## 🔧 Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the provided migrations in `supabase/migrations/`
3. Configure Row Level Security (RLS) policies
4. Set up storage bucket for media files

### Meta Developer Setup

1. Create a Meta Developer account
2. Create a new app with Threads API access
3. Configure OAuth redirect URLs
4. Set required permissions:
   - `threads_basic`
   - `threads_content_publish`
   - `threads_manage_insights`

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | ✅ |
| `META_APP_ID` | Meta app ID | ✅ |
| `META_APP_SECRET` | Meta app secret | ✅ |
| `NEXTAUTH_URL` | Application URL | ✅ |
| `NEXTAUTH_SECRET` | Random secret for sessions | ✅ |

## 🧪 Testing

### Run All Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### Test Structure

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Full user workflow testing with Playwright

Target coverage: 80% lines, 70% integration coverage

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production deployment
docker-compose --profile production up -d
```

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

### Environment-Specific Configurations

- **Development**: Hot reloading, debug logging
- **Staging**: Production build, test data
- **Production**: Optimized build, monitoring, backups

## 📊 API Documentation

### Authentication

All API endpoints require authentication via session cookies.

### Endpoints

#### Posts
- `GET /api/posts` - List user posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/publish` - Publish post to Threads

#### Analytics
- `GET /api/analytics` - Get analytics data
- `POST /api/analytics` - Update analytics from Threads

#### Media
- `POST /api/media` - Upload media file
- `GET /api/media` - List user media

#### Scheduler
- `GET /api/scheduler` - Get queue status
- `POST /api/scheduler` - Process scheduled posts
- `DELETE /api/scheduler` - Remove from queue

### Rate Limits

- Posts: 100 requests/hour
- Media: 50 requests/hour
- Analytics: 200 requests/hour
- Scheduler: 30 requests/hour

## 🔒 Security Features

- **Row Level Security (RLS)** on all database tables
- **Rate limiting** per user and endpoint
- **Input validation** and sanitization
- **CSRF protection** via Next.js
- **Secure headers** via middleware
- **Audit logging** for sensitive operations

## 🎯 Performance

- **Target Load Time**: <3 seconds
- **Lighthouse Score**: 90+ on all metrics
- **Database Optimization**: Indexed queries, connection pooling
- **CDN Integration**: Static asset optimization
- **Image Optimization**: Next.js automatic optimization

## 🛠 Development

### Code Quality

```bash
# Linting
pnpm lint

# Type checking
pnpm type-check

# Format code
pnpm format
```

### Database Management

```bash
# Create new migration
npx supabase migration new migration_name

# Reset database
npx supabase db reset

# Generate types
npx supabase gen types typescript --local > src/types/database.ts
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new features
- Update documentation
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/yourusername/threads-scheduler/issues)
- 💬 [Discussions](https://github.com/yourusername/threads-scheduler/discussions)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [Supabase](https://supabase.com/) for backend infrastructure
- [Meta Threads API](https://developers.facebook.com/docs/threads) for integration
- [TailwindCSS](https://tailwindcss.com/) for styling

---

Built with ❤️ for the Threads community
