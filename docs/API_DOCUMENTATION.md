# Placement Reality REST API Documentation

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register student or moderator account | No |
| `POST` | `/auth/login` | Log in and receive JWT token | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes (Bearer) |
| `PUT` | `/auth/profile` | Update user settings and DPDP consent | Yes (Bearer) |
| `POST` | `/auth/forgot-password`| Initiate token-based reset flow | No |
| `POST` | `/auth/reset-password` | Reset password using valid token | No |
| `POST` | `/auth/verify-email` | Verify student email address | No |

---

## 2. Colleges & Directories (`/api/colleges`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/colleges` | Search and filter colleges (tier, state, city) | No |
| `GET` | `/colleges/:slugOrId`| Retrieve college profile and departments | No |
| `GET` | `/colleges/:id/departments` | List departments for a college | No |
| `GET` | `/colleges/:id/seasons` | List placement seasons for a college | No |
| `POST` | `/colleges` | Create college record (Audit logged) | Yes (Admin) |
| `PUT` | `/colleges/:id` | Update college details & tier rating | Yes (Admin) |

---

## 3. Placement Intelligence (`/api/placements`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/placements/:collegeId/seasons/:seasonId` | Get full season KPIs, salary distribution & denominator | No |
| `GET` | `/placements/:collegeId/history` | Get multi-year historical placement trends | No |
| `POST` | `/placements/records` | File or update verified placement record | Yes (Admin/Mod) |

---

## 4. Offers & Submissions (`/api/offers`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/offers` | Submit student placement outcome (Multipart upload) | Yes (Student) |
| `GET` | `/offers/my-offers` | Retrieve authenticated user's submitted offers | Yes (Student) |
| `GET` | `/offers/college/:collegeId` | Anonymized public verified offers | No |
| `PUT` | `/offers/:id/verify` | Verify or reject offer with moderator notes | Yes (Admin/Mod) |

---

## 5. Internships (`/api/internships`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/internships` | List filtered internships (paid/unpaid, mode) | No |
| `POST` | `/internships` | Submit internship experience & certificate | Yes (Student) |
| `GET` | `/internships/analytics/:collegeId` | Get college stipend & PPO analytics | No |

---

## 6. Student Reviews (`/api/reviews`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/reviews/college/:collegeId` | Approved reviews with 6 category averages | No |
| `POST` | `/reviews` | Submit new student review (pseudonymous toggle) | Yes (Student) |
| `POST` | `/reviews/:id/report` | Report review for moderation queue | No |
| `PUT` | `/reviews/:id/moderate` | Approve or reject review | Yes (Admin/Mod) |

---

## 7. College Comparisons (`/api/comparisons`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/comparisons` | Side-by-side comparison matrix for 2-4 colleges | No |

---

## 8. Placement AI Copilot (`/api/ai`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/ai/chat` | Query AI assistant with grounded context | No (Rate limited) |
| `GET` | `/ai/conversations/:sessionId` | Retrieve chat message thread | No |
| `GET` | `/ai/status` | Get active provider status | No |

---

## 9. Administration & Compliance (`/api/admin`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/overview` | Platform-wide KPIs & completeness metrics | Yes (Admin/Mod) |
| `GET` | `/admin/audit-logs` | Cryptographic audit trail with change reasons | Yes (Admin/Mod) |
| `GET` | `/admin/offers/queue` | Verification queue for student submissions | Yes (Admin/Mod) |
| `GET` | `/admin/reviews/queue` | Queue for flagged student reviews | Yes (Admin/Mod) |
| `GET` | `/admin/users` | List registered accounts | Yes (Admin) |
| `PUT` | `/admin/users/:id/role`| Promote user role | Yes (Admin) |
| `PUT` | `/admin/users/:id/verify-college` | Validate college affiliation badge | Yes (Admin/Mod) |

---

## 10. Confidential Document Access (`/api/documents`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/documents/:evidenceId` | Stream encrypted verification document | Yes (Owner/Admin) |
