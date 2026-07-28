# Contributing to LinkPulse

Thank you for your interest in contributing to LinkPulse! This guide will help you get started.

## Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- PostgreSQL
- Redis
- Git

### Setup

1. Fork the repository on GitHub.

2. Clone your fork:
   ```bash
   git clone https://github.com/<your-username>/linkpulse.git
   cd linkpulse
   ```

3. Install backend dependencies:
   ```bash
   npm install
   ```

4. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

5. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database URL, Redis URL, and JWT secret.

6. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

7. Start the development servers:
   ```bash
   # Terminal 1 - Backend
   npm run dev

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

## Development Workflow

### Branch Naming

Use descriptive prefixes for your branches:

- `feature/description` — new features
- `bugfix/description` — bug fixes
- `fix/description` — urgent fixes

Example: `feature/url-expiry-notifications`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, missing semicolons, etc.
- `refactor` — code restructuring without changing behavior
- `test` — adding or updating tests
- `chore` — build process, tooling, dependencies

Examples:
```
feat(analytics): add device type breakdown
fix(auth): resolve token refresh race condition
docs: update API endpoint documentation
```

### Pull Request Process

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. Make your changes and commit with clear messages.

3. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```

4. Open a pull request against `main` with:
   - A clear title describing the change
   - A description of what changed and why
   - Steps to test your changes
   - Screenshots for UI changes

5. Wait for review. Address any feedback promptly.

## Code Style

### Backend

- Plain JavaScript (ES modules)
- No TypeScript except `prisma.config.ts`
- Use `async/await` for asynchronous code
- Handle errors with try/catch blocks
- Use Prisma for all database queries — no raw SQL

### Frontend

- React 19
- Functional components with hooks
- CSS Modules for styling
- [oxlint](https://oxc-project.github.io/) for linting — run it before committing:
  ```bash
  cd frontend
  npx oxlint .
  ```

## Project Structure

```
linkpulse/
├── prisma/              # Database schema and migrations
├── src/
│   ├── middleware/       # Express middleware (auth, rate limiting, etc.)
│   ├── routes/          # API route handlers
│   └── utils/           # Helper functions
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page-level components
│   │   └── utils/       # Frontend utilities
│   └── public/          # Static assets
├── .env.example         # Environment variable template
├── package.json         # Backend dependencies
└── server.js            # Application entry point
```

## What NOT to Contribute

- **No major rewrites without prior discussion.** Open an issue first to propose and discuss large changes.
- **No new dependencies without justification.** Every new dependency adds maintenance burden. Explain why it is needed in your PR description.
- **No framework migrations.** LinkPulse is built on Express and React. Suggestions for alternative frameworks should be discussed in issues first.
- **No breaking changes to the API** without a version bump and migration path.

## Questions?

Open an issue with the `question` label if you need help or clarification on anything.
