# Placement Reality 🎓
### AI-Powered College Placement Transparency & Analytics Platform

[![Node Version](https://img.shields.io/badge/Node.js-v24.x-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18.3-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-v5.4-646CFF?logo=vite)](https://vitejs.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-v8.x-47A248?logo=mongodb)](https://www.mongodb.com)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 1. Executive Vision

**Placement Reality** is an independent, full-stack college placement transparency and analytics platform engineered for students from **Tier 1, Tier 2, and Tier 3 institutions across India**.

Rather than accepting unverified promotional marketing brochures, the platform empowers students and aspirants to:
- Inspect **actual median salaries** rather than misleading averages skewed by a single international outlier.
- **Distinguish unique placed students from total job offers** (preventing multi-offer double counting).
- Enforce the **Denominator Rule**: If an institute suppresses its eligible candidate count, the platform **refuses to manufacture an estimated placement percentage**, highlighting the missing denominator instead.
- Submit confidential, encrypted offer letters and internship experiences to earn the **Student-Verified** badge.
- Consult **Placement AI**, a retrieval-augmented generation (RAG) assistant that answers questions using ground-truth disclosures with verified citations and zero hallucination.

---

## 2. Provenance Transparency Tiers

Every statistic displayed on Placement Reality is stamped with one of five provenance tiers:

| Tier | Badge | Definition |
| :--- | :--- | :--- |
| **Officially Reported** | Green Shield | Corroborated by NIRF mandatory filings or official university placement office disclosures. |
| **Student-Verified** | Blue User Check | Validated via uploaded confidential offer letters reviewed by platform moderators. |
| **Community-Reported** | Amber Users | Extracted from RTI petitions, alumni batch submissions, or pool drive records. |
| **Estimated / Incomplete** | Orange Help | Acknowledged dataset with coverage gaps or uncorroborated variables. |
| **Data Undisclosed** | Rose Eye Off | Explicitly identifies figures withheld by the institution. |

---

## 3. Technology Stack

### Frontend (`client/`)
- **React.js 18** with **Vite 5** for blazing fast HMR and optimized production bundles.
- **Tailwind CSS** with a custom navy (`#0f172a`), slate, tech blue, and purple accent palette.
- **React Router 6** with protected route guards for students, moderators, and administrators.
- **Recharts** for interactive salary distribution histograms and multi-year trend line charts.
- **Axios** with centralized request/response interceptors and bearer token authorization.
- **Lucide React** icons for modern SaaS aesthetics.

### Backend (`server/`)
- **Node.js** & **Express.js** REST API.
- **MongoDB** with **Mongoose** (14 schemas with relations, compound unique indexes, and audit hooks).
- **JWT Authentication** with bcrypt password hashing and token expiration handling.
- **Multer** for controlled, encrypted document uploads.
- **Express Rate Limit** and **Helmet** for hardened network security.
- **Comprehensive Test Suite** (23 passing automated unit & integration tests).

### AI & RAG Engine (`server/src/services/aiService.js`)
- Grounded Retrieval-Augmented Generation (RAG) connecting live queries to database records.
- Configurable multi-provider architecture supporting **Google Gemini 1.5 Flash**, **OpenAI GPT-4o-mini**, or the **Deterministic Ground-Truth RAG Engine** with zero hallucination.

---

## 4. Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v24.15.0)
- **npm**: v9+ (tested on npm 11.12.1)
- **MongoDB**: v6+ running locally on port 27017

### Step 1: Clone or Navigate to Project
```bash
cd C:\Users\KIIT\.gemini\antigravity\scratch\placement-reality
```

### Step 2: Install Server Dependencies & Seed Database
```bash
cd server
npm install
npm run seed     # Seeds realistic synthetic Tier 1, 2, and 3 benchmarks
npm test         # Runs the 23-test verification suite
```

### Step 3: Install Client Dependencies
```bash
cd ../client
npm install
npm run build    # Validates production Vite compilation
```

### Step 4: Run the Application
In terminal 1 (Backend API):
```bash
cd server
npm start        # Runs on http://localhost:5000
```

In terminal 2 (Frontend Client):
```bash
cd client
npm run dev      # Runs on http://localhost:5173
```

Visit **`http://localhost:5173`** in your browser!

---

## 5. Seed Test Accounts

The seeder populates realistic synthetic accounts for immediate evaluation:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@placementreality.org` | `AdminPass123!` | Audit logs, college profiles, user roles, full moderation queue |
| **Moderator** | `moderator@placementreality.org` | `ModPass123!` | Offer verification queue, review approval/rejection |
| **Verified Student** | `student.rahul@kiit.ac.in` | `StudentPass123!` | Student dashboard, verified badges, offer filing |
| **Unverified Student** | `student.ananya@vit.ac.in` | `StudentPass123!` | Demonstrates self-reported vs document-verified flows |

*Note: The Login screen includes a 1-click test credentials bar for instant evaluation!*

---

## 6. Testing

Run the automated backend test suite:
```bash
cd server
npm test
```

The test runner validates:
1. **Mathematical Accuracy**: Median calculations on odd and even sets, batch averages, and salary binning.
2. **Denominator Integrity**: Proving that placement rates are withheld when the eligible student denominator is null or zero.
3. **Authentication & JWT**: Token generation, verification, and expiration handling.
4. **Integration Ground Truth**: Verification of seeded KIIT, VIT, and IIT Bombay placement records against database schemas.
5. **Duplicate Detection**: Preventing repeated student submissions for the same company and cycle.

---

## 7. AI Assistant Setup

To connect live cloud LLM APIs, configure `server/.env`:

```env
# Google Gemini Integration (Recommended)
GEMINI_API_KEY=your_google_ai_studio_api_key_here

# OR OpenAI Integration
OPENAI_API_KEY=your_openai_api_key_here
```

If no API key is specified, the platform automatically utilizes its **Deterministic Ground-Truth RAG Engine**, answering questions accurately with verified platform citations and displaying an informative notice.

---

## 8. Indian Privacy & DPDP Compliance

- **Document Isolation**: Offer letters uploaded during verification are saved to `/uploads/` with randomized UUID tokens and are **never exposed to the public**.
- **Pseudonymous Display**: Students can write reviews and submit statistics under generated or custom pseudonyms.
- **Revocable Consent**: Users can toggle statistical data aggregation at any time from their Profile page in accordance with the Digital Personal Data Protection (DPDP) Act.

---

## 9. Project Structure

```
placement-reality/
├── client/                     # Vite React Frontend
│   ├── src/
│   │   ├── api/                # Axios API clients
│   │   ├── components/         # Layout & transparency widgets
│   │   ├── context/            # Authentication context
│   │   ├── pages/              # 12+ application screens
│   │   ├── App.jsx             # React Router with route guards
│   │   └── main.jsx
│   ├── tailwind.config.js      # Palette and font typography
│   └── vite.config.js          # Proxy configuration to backend
├── server/                     # Express & MongoDB Backend
│   ├── src/
│   │   ├── config/             # DB & server config
│   │   ├── controllers/        # REST route handlers
│   │   ├── middleware/         # Auth, roles, multer, rate-limit
│   │   ├── models/             # 14 Mongoose schemas
│   │   ├── routes/             # REST route declarations
│   │   ├── seed/               # Synthetic database seeder
│   │   ├── services/           # Analytics, AI RAG, audit trail
│   │   ├── tests/              # Automated test suite
│   │   └── server.js           # Server entry point
│   ├── .env.example
│   └── package.json
├── docs/                       # Technical specifications
│   ├── AI_ARCHITECTURE_AND_RAG.md
│   ├── API_DOCUMENTATION.md
│   └── DATA_VERIFICATION_WORKFLOW.md
├── README.md
└── .gitignore
```

---

© 2026 Placement Reality. Built for transparency in Indian higher education.
