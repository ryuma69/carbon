# EcoLens: AI-Powered Carbon Intelligence Platform

EcoLens is an interactive, intelligent carbon tracking and reduction platform designed for the **Personal Sustainability & Climate Action** vertical. It helps individuals understand, track, and reduce their environmental impact through simple actions, smart utility receipt parsing, and adaptive AI-driven insights.

---

## 📖 Table of Contents
* [Problem Statement](#-problem-statement)
* [Solution Approach](#-solution-approach)
* [System Architecture](#-system-architecture)
* [Key Features](#-key-features)
* [Security Considerations](#-security-considerations)
* [Accessibility Considerations](#-accessibility-considerations)
* [Testing Strategy](#-testing-strategy)
* [Technical Assumptions](#-technical-assumptions)
* [Setup & Installation](#-setup--installation)
* [Future Roadmap](#-future-roadmap)

---

## 🚨 Problem Statement

Personal carbon tracking is historically hindered by three major hurdles:
1.  **Friction-Heavy Logging**: Manually entering utility bills, commute logs, and food choices is tedious, causing users to abandon trackers within weeks.
2.  **Lack of Dynamic Feedback**: Static calculators give a retrospective footprint score but fail to provide actionable, adaptive daily coaching.
3.  **"Black Box" Advice**: Recommendations are often generic (e.g., "Install solar panels") and fail to consider the user's specific context (e.g., whether they rent, their financial limits, or local public transit availability).

---

## 💡 Solution Approach

EcoLens addresses these problems with three core subsystems:
1.  **Conversational Eco-Coach**: A Gemini-powered smart assistant that supports conversational logging (e.g., "I drove 20 miles today") and parses uploaded energy receipts or utility bills in real-time.
2.  **Transparent Decision-Making Engine**: A mathematical calculator that ranks recommendations based on **Emissions Impact** and **Ease of Adoption**, dynamically shifting priority weights based on user behavior (e.g., if a user routinely skips high-friction options, the engine adjusts to emphasize smaller, daily wins).
3.  **Real-World Context Integrations**: Simulates real-time regional grid emissions variations throughout the day to suggest optimal schedules for electricity-heavy household tasks.

---

## 🏗️ System Architecture

EcoLens is organized as a modular, typed monorepo using **npm workspaces**:

```text
               +-------------------------------------------+
               |            React Single Page App          |
               |         (Vite / TypeScript / CSS)         |
               +---------------------|---------------------+
                                     | (REST API / JSON)
                                     v
               +-------------------------------------------+
               |        Express.js Backend Server          |
               |              (TypeScript)                 |
               +-------|---------------------|-------------+
                       |                     |
      (Prisma / SQL)   v                     v   (Gemini SDK / HTTPS)
               +---------------+     +---------------------+
               | SQLite Database|     |  Google Gemini API  |
               +---------------+     |   (2.5-flash LLM)   |
                                     +---------------------+
```

-   **Frontend Client**: React components styled with customized, responsive CSS variables. No bulky external framework dependencies.
-   **Backend Server**: Express router dividing concerns into Controllers (routing/serialization), Services (business logic & APIs), and Repositories (database operations).
-   **Database**: Self-contained SQLite database managed via Prisma ORM for quick setup.

---

## ✨ Key Features

*   💬 **Smart Eco-Coach**: An interactive chat window that allows users to ask questions, log activities, and receive instant, structured responses.
*   📊 **Emissions Dashboard**: Pure CSS/SVG charts that visualize emissions trends across Transportation, Diet, Utilities, and Shopping, and forecast carbon budget exhaustion dates.
*   ⚡ **Grid Energy Optimizer**: Fetches dynamic grid intensity projections and highlights the lowest-carbon hours to run heavy home appliances.
*   📄 **Utility OCR Scanner**: Extracts consumption metrics (kWh, therms) from uploaded bills and logs them directly without storing raw user documents on disk.
*   🌱 **Adaptive checklist**: Offers actionable recommendations that adapt weights depending on the user's profile and behavioral completions.

---

## 🔒 Security Considerations

EcoLens implements a zero-trust model designed for hackathon and production scrutiny:
*   **Input Sanitization**: All endpoint boundaries are protected using Zod schema validators to prevent parameter pollution or numeric overflows.
*   **Secure API Boundaries (BOLA)**: User identifiers are extracted directly from signed JWT session payloads at the middleware layer.
*   **In-Memory OCR Processing**: Uploaded utility bills are parsed strictly in volatile memory (RAM) and immediately garbage-collected without ever being saved to persistent disk.
*   **System Instruction Protection**: Isolates instructions and schemas inside Gemini’s developer configurations to prevent prompt injection attacks.
*   **Secure Tokens**: Stores JWT keys inside `HttpOnly, Secure, SameSite=Strict` cookies.

---

## ♿ Accessibility Considerations

EcoLens is built from the ground up to comply with **WCAG 2.1 AA** guidelines:
*   **Keyboard Operability**: Full navigation sequence using tab indexing and highly visible outlines on `:focus-visible`.
*   **Screen Reader Friendly**: Utilizes semantic HTML5 tags and `aria-live="polite"` tags to ensure screen readers read out incoming AI messages in real-time.
*   **Contrast Standards**: HSL color tokens guarantee contrast ratios of $\ge 4.5:1$ for body text. Info states are reinforced with text/patterns rather than color alone.
*   **Touch Targets**: Buttons and tabs have a minimum clickable area of $48\times48$ pixels.
*   **Error Reporting**: Input field validation errors dynamically toggle `aria-invalid` attributes and link error strings using `aria-describedby`.

---

## 🧪 Testing Strategy

*   **Unit Tests**: We run Vitest tests covering core carbon logic formulas and recommendation calculations.
*   **Integration Tests**: Express route endpoints and JSON serialization contracts are validated using Supertest.
*   **E2E / Accessibility Auditing**: Playwright runs automated Axe-Core accessibility scans and ensures main user navigation flows are free of keyboard traps.

---

## ⚙️ Technical Assumptions

1.  **Grid Coefficients**: Assumes default regional average grid coefficients (e.g., US average of 0.37 kg CO₂e/kWh) where real-time ZIP code telemetry is unavailable.
2.  **Gemini API Key**: Requires a valid `GEMINI_API_KEY` configured in the backend environment.
3.  **SQLite Constraints**: Designed for individual database sessions, utilizing local SQLite file storage (`dev.db`).

---

## 🚀 Setup & Installation

### Prerequisites
*   Node.js (v18.x or higher)
*   npm (v9.x or higher)

### 1. Clone & Install Dependencies
From the repository root directory, run:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file inside the `backend/` directory:
```env
PORT=4000
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_gemini_api_key_here"
JWT_SECRET="generate_a_secure_random_key"
```

### 3. Initialize the Database
Generate the SQLite file and apply database migrations using Prisma:
```bash
# From the root directory
npm run db:setup
```

### 4. Start the Application
Launch both backend and frontend servers concurrently:
```bash
npm run dev
```
*   The frontend client will open at: `http://localhost:5173`
*   The backend server will run at: `http://localhost:4000`
---

## 🔮 Future Roadmap

*   **Real Banking Integrations**: Connect with Plaid to automatically categorize and estimate carbon footprints from transaction histories.
*   **IoT Smart-Home Schedulers**: Direct API integrations with smart thermostats and EV chargers to automatically shift consumption during low-carbon grid intervals.
*   **Community Leagues**: Let families or organizations create private carbon leagues, sharing gamified progress and collective reduction targets.
