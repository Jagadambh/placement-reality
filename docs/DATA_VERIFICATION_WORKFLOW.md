# Placement Reality: Data Verification & Integrity Methodology

## 1. Executive Summary

Placement Reality was engineered to address a pervasive crisis in Indian higher education: promotional placement marketing brochures that exaggerate compensation outcomes, conflate multiple job offers with unique placed students, and mask high unemployment rates by suppressing the eligible candidate denominator.

Our platform enforces strict mathematical truth-in-data principles across all Tier 1, Tier 2, and Tier 3 institutions.

---

## 2. The Five-Tier Provenance Classification

Every metric displayed on Placement Reality is stamped with a provenance status badge:

| Status Badge | Icon | Verification Standard |
| :--- | :--- | :--- |
| **Officially Reported** | Shield Check (Green) | Corroborated by mandatory institutional filings under NIRF (National Institutional Ranking Framework) or audited statutory reports. |
| **Student-Verified** | User Check (Blue) | Submitted by an authenticated student and validated against confidential offer letters or salary slips by platform moderators. |
| **Community-Reported** | Users (Amber) | Disclosed through Right to Information (RTI) petitions, alumni batch surveys, or campus placement committee leaks. |
| **Estimated / Incomplete** | Help Circle (Orange) | Data exhibits coverage gaps or methodological anomalies. Critical variables remain uncorroborated. |
| **Data Undisclosed** | Eye Off (Rose) | The institution has deliberately withheld the figure from mandatory disclosures or student prospectuses. |

---

## 3. Strict Mathematical Rules

### Rule 1: Denominator Verification & Rate Calculation
Placement percentage cannot be calculated without an explicit, verifiable count of **eligible graduating students**.
$$\text{Placement Rate} = \frac{\text{Unique Placed Students}}{\text{Total Eligible Graduating Students}} \times 100$$
- If an institute publishes total offers (e.g. 12,018) and unique placed students (7,305), but **withholds the eligible student denominator**, Placement Reality displays:
  > *"Verified Placement Rate: Rate Withheld (Eligible student denominator undisclosed by institute. Platform policy forbids manufacturing an estimated percentage.)"*

### Rule 2: Separation of Unique Placed Students from Gross Offers
- A student receiving 4 offers (e.g., 1 IT Service + 2 Product + 1 PPO) is counted as **exactly 1 unique placed student** and **4 total job offers**.
- Gross offer inflation is permanently separated from actual batch employment.

### Rule 3: Median vs Average Package
- The **Median Package** (50th percentile) is highlighted as the primary compensation metric because average packages are heavily skewed by extreme outliers (e.g., a single 1.5 Crore international offer).

---

## 4. Student Identity Protection & Encryption

1. **Controlled Document Storage**:
   - Uploaded offer letters and ID credentials are saved to an isolated storage directory (`/uploads/`) with randomized UUID tokens.
   - Files are **never served statically** through public asset routes.
   - Access is restricted via `/api/documents/:evidenceId`, requiring JWT authentication as either the document owner or an authorized administrator/moderator.
2. **Public Pseudonyms**:
   - When submitting offers or writing reviews, students may toggle their pseudonymous display name (e.g., `Student_AF72B`).
   - Personally identifiable information (PII) is completely excluded from public aggregation APIs.

---

## 5. Duplicate Detection Engine

The duplicate detection service (`server/src/services/duplicateDetectionService.js`) prevents double counting:
1. **Hard Duplicate**: Matches same `studentId` + normalized `companyName` + `seasonId`. Subsequent submissions for the same recruiter in the same cycle are rejected with HTTP 409.
2. **Suspicious Collision**: Matches identical role + CTC within the same season for the candidate, flagging the record for moderator scrutiny.

---

## 6. Immutable Audit Trail

All administrative overrides and verification approvals are recorded in the `AuditLog` collection:
- `actionType` (`VERIFY_OFFER`, `REJECT_OFFER`, `OVERWRITE_RECORD`, `TIER_CLASSIFICATION_CHANGE`)
- `performedBy` (User ID, Email, Role)
- `changeReason` (Mandatory documented rationale)
- `oldValues` and `newValues` (State snapshots)
- Timestamp, IP address, and User-Agent
