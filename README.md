🇺🇸 [한국어](./README.ko.md)

# FinQuiz Daily — Daily Financial Literacy Quiz Mini-App

A lightweight daily quiz application for testing financial knowledge. Users solve new quiz sets each day, track their results, review wrong answers, and compete on weekly rankings. Built as a Toss mini-app with offline-first local storage and reactive state management.

## Features

- 📝 **Daily Quiz Sessions** — 3 randomized questions per day (same set within 24 hours)
- ✅ **Instant Results** — Immediate score display after completion
- 📚 **Wrong Answer Review** — Track and browse all incorrect responses with timestamps
- 🏆 **Weekly Leaderboard** — Local and remote ranking modes (API-ready)
- 💾 **Persistent State** — Offline-first storage with defensive normalization

## Tech Stack

- **Frontend Framework:** React 18 + React Router 7.5
- **Build Tool:** Vite 6.3
- **Design System:** Toss Design System (TDS) Mobile + AIT
- **Styling:** Emotion (CSS-in-JS)
- **Type System:** TypeScript 5.8
- **State Management:** React hooks + localStorage
- **Testing:** Vitest + Playwright visual regression
- **Target Platforms:** Android 7+, iOS 16+

## Getting Started

### Prerequisites
- Node.js 16+ (npm)

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Starts Vite dev server at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Run Tests
```bash
# Unit & integration tests
npm run test

# Watch mode
npm run test:watch

# Visual regression (Playwright)
npm run test:visual
npm run test:visual:update  # Update snapshots
```

### Type Checking
```bash
npm run typecheck
```

### Verify Production Build
```bash
npm run verify:build
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_APP_NAME` | Mini-app name registered in Toss console | Yes (via build) |

## Project Structure

```
src/
├── pages/              # Route page components
│   ├── QuizPage.tsx   # Daily quiz interface
│   ├── ResultPage.tsx # Score display
│   ├── WrongNotePage.tsx # Wrong answer review
│   └── RankingPage.tsx    # Weekly leaderboard
├── components/        # Shared UI components
│   └── EmptyState.tsx # Fallback UI for empty states
├── lib/              # Business logic & utilities
│   ├── types.ts      # Shared TypeScript interfaces
│   ├── quizState.ts  # Quiz state & data retrieval
│   ├── storage.ts    # localStorage wrapper
│   ├── contract.ts   # Data contracts
│   └── date.ts       # Date formatting utilities
├── __tests__/        # Test suite
├── App.tsx           # Route definitions
└── main.tsx          # Entry point (do not modify)
```

## Deployment

This app uses Toss mini-app platform deployment. Build output is hosted on Toss CDN as a static CSR-only application.

1. Ensure `apps-in-toss.config.ts` appName matches Toss console registration
2. Run `npm run build` to generate `/dist`
3. Push to repository with valid `package.json` and `vite.config.ts`
4. Toss CI/CD pipeline handles deployment automatically

**Note:** Dynamic SSR is not supported. Only client-side rendering (CSR) and static generation (SSG).

## License

MIT
