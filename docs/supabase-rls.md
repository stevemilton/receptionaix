# Supabase Row Level Security (RLS) Skill

## Overview

Row Level Security (RLS) ensures users can only access their own data. Without proper RLS, your API is insecure — any authenticated user could read/modify any row.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **RLS Policy** | SQL rule that filters rows based on conditions |
| **auth.uid()** | Returns the current authenticated user's ID |
| **USING clause** | Filter for SELECT, UPDATE, DELETE |
| **WITH CHECK clause** | Validation for INSERT, UPDATE |

---

## Step 1: Enable RLS on Tables

**Always enable RLS on every table that stores user data:**

```sql
-- migrations/001_enable_rls.sql

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
```

⚠️ **Warning:** Once RLS is enabled, NO rows are accessible by default. You must create policies.

---

## Step 2: Create Policies

### Pattern 1: User Owns Row Directly

When the table has a direct relationship to the user (e.g., `merchants` where `id = auth.uid()`):

```sql
-- Merchants can only see/edit their own record
CREATE POLICY "merchants_own_record" ON merchants
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### Pattern 2: User Owns via Foreign Key

When rows belong to a merchant via foreign key:

```sql
-- Customers belong to a merchant
CREATE POLICY "customers_belong_to_merchant" ON customers
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Calls belong to a merchant
CREATE POLICY "calls_belong_to_merchant" ON calls
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Appointments belong to a merchant
CREATE POLICY "appointments_belong_to_merchant" ON appointments
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Knowledge bases belong to a merchant
CREATE POLICY "kb_belong_to_merchant" ON knowledge_bases
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());
```

### Pattern 3: Service Role Bypass

The service role (used by your backend) bypasses RLS. Use it for:
- Webhooks (Twilio, Stripe)
- Admin operations
- Cross-tenant queries

```typescript
// Use service role for backend operations
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Bypasses RLS
);

// Use anon key for client operations (respects RLS)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## Step 3: Admin Access Pattern

For your enterprise admin dashboard, admins need to see all merchants:

```sql
-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only admins can see admin_users table
CREATE POLICY "admin_only" ON admin_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    )
  );

-- Admins can view all merchants
CREATE POLICY "admin_view_merchants" ON merchants
  FOR SELECT
  USING (
    id = auth.uid()  -- Merchant sees own record
    OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())  -- Admin sees all
  );

-- Admins can view all calls
CREATE POLICY "admin_view_calls" ON calls
  FOR SELECT
  USING (
    merchant_id = auth.uid()
    OR
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
```

---

## Step 4: Separate Policies by Operation

For fine-grained control, create separate policies per operation:

```sql
-- Merchants can SELECT their own customers
CREATE POLICY "customers_select" ON customers
  FOR SELECT
  USING (merchant_id = auth.uid());

-- Merchants can INSERT customers (must set merchant_id to self)
CREATE POLICY "customers_insert" ON customers
  FOR INSERT
  WITH CHECK (merchant_id = auth.uid());

-- Merchants can UPDATE their own customers
CREATE POLICY "customers_update" ON customers
  FOR UPDATE
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Merchants can DELETE their own customers
CREATE POLICY "customers_delete" ON customers
  FOR DELETE
  USING (merchant_id = auth.uid());
```

---

## Common Mistakes

### ❌ Forgetting to Enable RLS
```sql
-- Table has no RLS - anyone can read everything!
CREATE TABLE customers (...);
```

### ✅ Always Enable RLS
```sql
CREATE TABLE customers (...);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON customers ...;
```

### ❌ Using Wrong User ID
```sql
-- WRONG - user_id column doesn't exist, it's merchant_id
CREATE POLICY "bad" ON customers
  USING (user_id = auth.uid());
```

### ✅ Match Your Schema
```sql
-- CORRECT - use the actual column name
CREATE POLICY "good" ON customers
  USING (merchant_id = auth.uid());
```

### ❌ Missing WITH CHECK
```sql
-- WRONG - allows INSERT but doesn't validate merchant_id
CREATE POLICY "bad" ON customers
  FOR INSERT
  USING (merchant_id = auth.uid());  -- USING doesn't apply to INSERT!
```

### ✅ Use WITH CHECK for INSERT/UPDATE
```sql
-- CORRECT
CREATE POLICY "good" ON customers
  FOR INSERT
  WITH CHECK (merchant_id = auth.uid());
```

### ❌ Service Role in Client Code
```typescript
// WRONG - exposes service role to browser!
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);
```

### ✅ Service Role Only on Server
```typescript
// CORRECT - service role only in API routes/server code
// Client uses anon key
const supabaseClient = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
```

---

## Testing RLS Policies

### Test as Authenticated User
```typescript
// Test that merchant A can't see merchant B's data
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('merchant_id', 'other-merchant-id');

// Should return empty array, not error
expect(data).toEqual([]);
```

### Test Policy in SQL Editor
```sql
-- Temporarily become a user to test
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "merchant-uuid-here"}';

-- Now test queries
SELECT * FROM customers;  -- Should only see own customers
```

---

## Full Migration Example

```sql
-- migrations/002_rls_policies.sql

-- Enable RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Merchant policies
CREATE POLICY "merchants_own" ON merchants FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Customer policies
CREATE POLICY "customers_merchant" ON customers FOR ALL
  USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

-- Call policies
CREATE POLICY "calls_merchant" ON calls FOR ALL
  USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

-- Appointment policies
CREATE POLICY "appointments_merchant" ON appointments FOR ALL
  USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

-- Knowledge base policies
CREATE POLICY "kb_merchant" ON knowledge_bases FOR ALL
  USING (merchant_id = auth.uid()) WITH CHECK (merchant_id = auth.uid());

-- Admin policies (admins can view all)
CREATE POLICY "admin_users_admin_only" ON admin_users FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Admin can view all merchants
CREATE POLICY "merchants_admin_view" ON merchants FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Admin can view all calls
CREATE POLICY "calls_admin_view" ON calls FOR SELECT
  USING (merchant_id = auth.uid() OR EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));
```

---

## Environment Variables

```bash
# Client-side (respects RLS)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-side (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```
