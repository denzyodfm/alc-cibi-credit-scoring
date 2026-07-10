# ALC CI/BI and Credit Scorecard System

First-version lending web application for Agusan Lending Corporation focused on branch profiling, user profiling, loan application encoding, CI/BI investigation, 5C scorecard computation, auto-DQ, and credit committee routing.

## Stack

- Next.js app router
- MySQL
- Prisma ORM
- Tailwind CSS
- Cookie-based signed session login
- bcrypt password hashing

## Install

```bash
npm install
```

## Configure MySQL

Create a MySQL database, then copy `.env.example` to `.env` and update:

```env
DATABASE_URL="mysql://alc_user:alc_password@localhost:3306/alc_cibi"
SESSION_SECRET="replace-with-a-long-random-secret"
```

## Run migrations

```bash
npm run prisma:migrate
```

The initial SQL migration is included at `prisma/migrations/0001_init/migration.sql`.

## Seed database

```bash
npm run prisma:seed
```

Seeded branches:

- ALC-HO / 001
- ALC-BXU / 002
- ALC-SFZ / 003
- ALC-BYG / 004
- ALC-TDG / 005
- ALC-CBCR / 006

Default login credentials:

| User | Username | Password |
| --- | --- | --- |
| Super Admin | `superadmin` | `Password123!` |
| Head Office Admin | `hoadmin` | `Password123!` |
| Head Office Credit Committee | `hocc` | `Password123!` |
| BXU Account Officer | `aobxu` | `Password123!` |
| BXU Branch Team Leader | `btlbxu` | `Password123!` |

## Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Branch tagging and access

When a branch user creates a loan application, the backend reads the logged-in user's branch and automatically saves both `branch_id` and `branch_code` on the transaction. Branch users can only see applications from their own branch. Super Admin, Head Office Admin, Head Office Credit Committee users, and Head Office users can see all branches.

Head Office or Super Admin users may create applications for an Account Officer in another branch; the loan is tagged to that officer's branch. Branch users cannot manually switch the branch tag.

## Scorecard computation

Scorecard categories and weights are stored in `scorecard_settings`:

- Character: 30%
- Capacity: 30%
- Capital: 10%
- Collateral: 15%
- Conditions: 15%

Each active criterion is stored in `scorecard_criteria` with its question guide, 0-4 descriptions, N/A treatment, and auto-DQ flag. The backend recomputes all scores before saving a recommendation.

For each category:

```text
actual score = sum of included item scores
adjusted max = included item count * 4
normalized category score = actual score / adjusted max
weighted category score = normalized category score * category weight
overall score = sum of weighted category scores
```

Decision thresholds:

- 80 and above: `PROCEED`
- 65 to 79.99: `FOR_CREDIT_COMMITTEE`
- Below 65: `DENIED`
- Any auto-DQ trigger: `AUTO_DENIED`

## Auto-DQ and N/A rules

Auto-DQ criteria seeded in the database:

- `1A` Honesty and Accuracy
- `1C` Credit History
- `2A` Debt-to-Income Ratio

If any of these included items receives `0`, the loan application status becomes `AUTO_DENIED`. The overall score is still computed and stored for record purposes.

N/A handling supports:

- `EXCLUDE_RENORMALIZE`: removes the item from the category max score
- `ASSIGN_NEUTRAL_2`: uses score 2
- `ASSIGN_FIXED_1`: uses score 1
- `ASSIGN_FIXED_2`: uses score 2
- `ASSIGN_FIXED_4`: uses score 4
- `NEVER_NA`: N/A is disabled

## Credit Committee routing

Credit committees are configured with `min_loan_amount` and `max_loan_amount`. When a scored application is `PROCEED` or `FOR_CREDIT_COMMITTEE`, the system creates pending review records for the matching committee members. Branch-level committees can handle lower loan amounts; Head Office committees can review applications from any branch.

Seeded routing:

- ALC-BXU Branch Credit Committee: 0 to 50,000
- Head Office Credit Committee: above 50,000

## Included modules

- Authentication with username/email and password
- Dashboard cards and recent applications
- Branch management
- User management
- Loan application list, filters, and creation
- Multi-step CI/BI editor
- 5C scorecard tabs with live preview
- Backend score recomputation and auto-DQ
- Branch-based access control
- Credit committee queue and decision history
- Printable CI/BI and scorecard report
- Audit logs for key actions

## Deliberately out of scope

Payment posting, interest posting, loan charges, penalties, and running loan balances are not implemented yet. The schema is structured around applications, CI/BI, scorecards, committees, and audit logs so those modules can be added in a later phase.
