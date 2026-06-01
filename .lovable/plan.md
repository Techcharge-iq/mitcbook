# Performance verification + Authentication with roles

## Part 1 — Performance fixes (verification only)

All 4 fixes from `.lovable/plan.md` are already present in the codebase:

| Fix | File | Status |
|-----|------|--------|
| A — stable `setValue` via ref | `src/hooks/useLocalStorage.ts` | Done |
| B — `useMemo` provider value | `src/contexts/AppContext.tsx` (line 1117) | Done |
| C — guarded auto-number effect | `src/pages/InvoiceForm.tsx` (line 144) | Done |
| D — memoized payments map | `src/pages/InvoicesList.tsx` (line 30) | Done |

Action: open Sales / Quotations / Projects in the preview and confirm no freeze. If any page is still slow, fix only that page (no broad refactor). No credit spent here unless a regression is found.

## Part 2 — Authentication (email/password + Google, with roles)

### Database (1 migration)

1. `app_role` enum: `admin`, `user`.
2. `user_roles` table (`id`, `user_id`, `role`, `created_at`, unique `(user_id, role)`).
3. `has_role(_user_id, _role)` SECURITY DEFINER function.
4. GRANTs + RLS on `user_roles`:
   - Users can read their own roles.
   - Only admins can insert/update/delete roles (via `has_role`).
5. Add **admin override** policies to existing tables (`clients`, `quotations`, `invoices`, `projects`, `purchase_invoices`, `payments`, `vouchers`, `journal_entries`, `accounts`, `items`, `salesmen`, `companies`, `business_settings`, `audit_log`): a permissive `FOR ALL` policy `USING (has_role(auth.uid(), 'admin'))`. Regular users keep the existing `own *` policies → see only their own data; admins see and manage everything.
6. Trigger on `auth.users` insert → call existing `handle_new_user()` (already creates profile). Extend trigger to also insert a default `user` role into `user_roles`. First registered user becomes `admin` (checked via `NOT EXISTS` on `user_roles`).

### Auth config

- Enable Email/password (already on).
- Call `configure_social_auth` with `providers: ["google"]`.
- Do **not** auto-confirm emails (default).
- Enable HIBP password protection.

### Frontend

New files:
- `src/pages/Auth.tsx` — single page with Login / Signup tabs + "Sign in with Google" button. Uses `supabase.auth.signInWithPassword`, `signUp` (with `emailRedirectTo: window.location.origin`), and `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- `src/hooks/useAuth.ts` — exposes `{ user, session, role, loading, signOut }`. Sets up `onAuthStateChange` first, then `getSession`. Fetches role from `user_roles` after sign-in.

Modified:
- `src/App.tsx` — add `/auth` route. Wrap protected routes in an `<AuthGate>` that:
  - If user is signed in → render children.
  - If not signed in → render children too (local-only fallback) but show a small banner in the header: *"Working offline — sign in to sync."*
  - Reads a `requireAuth` flag from settings; when on, redirects unauthenticated users to `/auth`. Default: off (keeps current local-only behavior).
- `src/components/layout/AppLayout.tsx` — show user email + role badge + Sign out button when signed in; "Sign in" link otherwise.
- `src/pages/Settings.tsx` — add "Require login" toggle and (admin-only) a small "Users & roles" panel to promote/demote users.

### What does NOT change

- No data migration. Existing localStorage data stays as-is. When a user signs in, the existing `useRemoteCollection` sync continues to push/pull their cloud rows. Admins additionally see other users' rows via the new override policies.
- No changes to invoice/quotation/journal logic, voucher numbering, or the radial nav.
- No password-reset page in this pass (can add later if needed).

## Files touched

- New: `supabase` migration, `src/pages/Auth.tsx`, `src/hooks/useAuth.ts`, `src/components/AuthGate.tsx`.
- Edited: `src/App.tsx`, `src/components/layout/AppLayout.tsx`, `src/pages/Settings.tsx`, `src/contexts/AppContext.tsx` (add `requireAuth` to settings type only).

## Credit budget

≤ 3 credits: perf verification is free, auth is one focused implementation pass (1 migration + ~4 new/edited UI files).
