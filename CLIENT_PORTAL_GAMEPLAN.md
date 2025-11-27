# 🏢 Client Portal - Complete Implementation Gameplan

**Priority:** 🔥 HIGH - Competitive Advantage  
**Time Estimate:** 2-3 weeks  
**Value:** ⭐⭐⭐⭐⭐

---

## 📋 **OVERVIEW**

Create a dedicated client-facing portal where clients can:
- View their sites and job history
- Request new work/services
- View and pay invoices
- Download service reports
- Message facility managers
- Track service quality

**Key Differentiator:** Most competitors don't offer client portals, giving you a significant advantage.

---

## 🎯 **CORE FEATURES**

### **Phase 1: Client Dashboard** (Week 1)
- Client login/authentication
- Dashboard with overview cards
- Site list (their sites only)
- Recent jobs summary
- Upcoming scheduled work
- Quick stats (total jobs, active sites, pending invoices)

### **Phase 2: Job Management** (Week 1-2)
- View all jobs for their sites
- Job details modal (read-only for clients)
- Job history timeline
- Photo gallery for completed jobs
- Service reports download
- Job status tracking

### **Phase 3: Service Requests** (Week 2)
- Request new booking/job
- Service catalog (selectable services)
- Priority selection (normal, urgent)
- Upload photos/attachments
- Request history
- Status tracking

### **Phase 4: Invoicing & Payments** (Week 2-3)
- View all invoices
- Invoice details with line items
- Download PDF invoices
- Payment history
- Payment status tracking
- Payment links (if payment processing integrated)

### **Phase 5: Communication** (Week 3)
- Message facility managers
- View conversation history
- File attachments
- Notification preferences

### **Phase 6: Reports & Documents** (Week 3)
- Service history reports
- Download service reports (PDF)
- Document library (contracts, certificates)
- Compliance documents

---

## 🗄️ **DATABASE SCHEMA**

### **1. Client Site Assignments** (Already exists via `sites.client_id`)
```sql
-- Sites table already has client_id column
-- Clients can only see sites where client_id = their user_id
```

### **2. Client Preferences** (New table)
```sql
CREATE TABLE IF NOT EXISTS client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  job_completed_notifications BOOLEAN DEFAULT true,
  invoice_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  
  -- Display Preferences
  default_view TEXT DEFAULT 'dashboard', -- dashboard, jobs, invoices
  items_per_page INTEGER DEFAULT 20,
  
  -- Communication Preferences
  preferred_contact_method TEXT DEFAULT 'email', -- email, phone, app
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- RLS Policies
ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own preferences"
  ON client_preferences FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can update own preferences"
  ON client_preferences FOR UPDATE
  USING (client_id = auth.uid());

CREATE POLICY "Clients can insert own preferences"
  ON client_preferences FOR INSERT
  WITH CHECK (client_id = auth.uid());
```

### **3. Service Requests** (New table)
```sql
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  
  -- Request Details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'scheduled', 'in-progress', 'completed', 'cancelled')),
  
  -- Service Selection
  requested_services JSONB, -- Array of service IDs
  requested_date DATE,
  preferred_time TEXT, -- Morning, Afternoon, Evening, Anytime
  
  -- Attachments
  attachments JSONB, -- Array of file URLs
  
  -- Response
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  response_notes TEXT,
  
  -- Linked Job (if converted to job)
  linked_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_site ON service_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);

-- RLS Policies
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own requests"
  ON service_requests FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

CREATE POLICY "Clients can create requests"
  ON service_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can update own requests (if pending)"
  ON service_requests FOR UPDATE
  USING (
    client_id = auth.uid() 
    AND status = 'pending'
  );

CREATE POLICY "Admins/Staff can update all requests"
  ON service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
```

### **4. Update Existing Tables**

**Sites Table RLS:**
```sql
-- Ensure clients can only see their own sites
DROP POLICY IF EXISTS "Clients can view own sites" ON sites;
CREATE POLICY "Clients can view own sites" ON sites
FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);
```

**Jobs Table RLS:**
```sql
-- Ensure clients can only see jobs for their sites
DROP POLICY IF EXISTS "Clients can view jobs for their sites" ON jobs;
CREATE POLICY "Clients can view jobs for their sites" ON jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites
    WHERE sites.id = jobs.site_id
    AND sites.client_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);
```

**Invoices Table RLS:**
```sql
-- Ensure clients can only see their own invoices
DROP POLICY IF EXISTS "Clients can view own invoices" ON invoices;
CREATE POLICY "Clients can view own invoices" ON invoices
FOR SELECT USING (
  client_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);
```

---

## 🎨 **UI/UX DESIGN**

### **Client Portal Pages**

#### **1. `client-portal.html` - Main Dashboard**
```
┌─────────────────────────────────────────┐
│  NFG Client Portal          [Logout]    │
├─────────────────────────────────────────┤
│  Welcome, [Client Name]                 │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │  Active  │ │  Pending │ │  Total   ││
│  │  Sites   │ │  Jobs    │ │ Invoices ││
│  │    5     │ │    3     │ │   $2,450 ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
│  My Sites                                │
│  ┌─────────────────────────────────────┐│
│  │ Site Name | Address | Status | View ││
│  └─────────────────────────────────────┘│
│                                         │
│  Recent Jobs                            │
│  ┌─────────────────────────────────────┐│
│  │ Job Title | Site | Status | View   ││
│  └─────────────────────────────────────┘│
│                                         │
│  Upcoming Work                          │
│  ┌─────────────────────────────────────┐│
│  │ Scheduled Date | Site | Service     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Pending Invoices                       │
│  ┌─────────────────────────────────────┐│
│  │ Invoice # | Amount | Due Date | Pay││
│  └─────────────────────────────────────┘│
│                                         │
│  [Request New Service]                  │
└─────────────────────────────────────────┘
```

#### **2. `client-jobs.html` - Job History**
- Filter by site, status, date range
- Search functionality
- Job cards with status badges
- Click to view job details (read-only modal)
- Photo gallery
- Download service report button

#### **3. `client-invoices.html` - Invoicing**
- Invoice list with filters (all, paid, pending, overdue)
- Invoice cards with status badges
- Click to view invoice details
- Download PDF button
- Payment button (if payment processing integrated)
- Payment history section

#### **4. `client-requests.html` - Service Requests**
- "New Request" button (opens modal)
- Request list with status tracking
- Request details modal
- Upload attachments
- View linked job (if converted)

#### **5. `client-messages.html` - Communication**
- Reuse existing messaging system
- Filter by site or admin
- File attachments
- Read receipts

#### **6. `client-settings.html` - Settings**
- Profile information (read-only or limited edit)
- Notification preferences
- Password change
- Site list (view only)

---

## 🔐 **AUTHENTICATION & SECURITY**

### **Login Flow**
1. Client goes to `client-portal.html` or `index.html`
2. System checks user role on login
3. If role = 'client', redirect to `client-portal.html`
4. If role = 'admin' or 'staff', redirect to `dashboard.html`

### **Role-Based Routing**
```javascript
// In auth.js or new client-auth.js
async function checkUserRoleAndRedirect() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = './index.html';
    return;
  }
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role === 'client') {
    // Prevent access to admin pages
    if (!window.location.pathname.includes('client-')) {
      window.location.href = './client-portal.html';
    }
  } else if (profile?.role === 'admin' || profile?.role === 'staff') {
    // Prevent access to client portal
    if (window.location.pathname.includes('client-')) {
      window.location.href = './dashboard.html';
    }
  }
}
```

### **RLS Security**
- All queries automatically filtered by RLS policies
- Clients can only see their own data
- No direct database access
- All actions logged

---

## 📁 **FILE STRUCTURE**

### **New Files to Create**

```
client-portal.html          # Main dashboard
client-jobs.html            # Job history page
client-invoices.html        # Invoicing page
client-requests.html        # Service requests page
client-messages.html        # Communication (reuse messaging)
client-settings.html        # Client settings

js/client-portal.js         # Main client portal logic
js/client-jobs.js           # Job viewing logic
js/client-invoices.js       # Invoice viewing logic
js/client-requests.js       # Service request logic
js/client-auth.js           # Client authentication & routing

css/client-portal.css       # Client portal specific styles (optional)
```

### **Files to Modify**

```
index.html                  # Add role-based redirect
js/auth.js                  # Add client role check
js/supabase.js             # Ensure RLS is working
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Foundation (Days 1-3)**
**Goal:** Basic client portal with dashboard

**Tasks:**
1. ✅ Create `ADD_CLIENT_PORTAL_SCHEMA.sql`
   - Client preferences table
   - Service requests table
   - Update RLS policies

2. ✅ Create `client-portal.html`
   - Dashboard layout
   - Summary cards
   - Site list
   - Recent jobs

3. ✅ Create `js/client-portal.js`
   - Fetch client data
   - Render dashboard
   - Navigation

4. ✅ Update `js/auth.js`
   - Role-based redirect
   - Client role check

5. ✅ Test authentication flow

**Deliverable:** Client can log in and see their dashboard

---

### **Phase 2: Job Management (Days 4-6)**
**Goal:** Clients can view their jobs

**Tasks:**
1. ✅ Create `client-jobs.html`
   - Job list with filters
   - Search functionality

2. ✅ Create `js/client-jobs.js`
   - Fetch jobs (filtered by RLS)
   - Render job cards
   - Job detail modal (read-only)

3. ✅ Add photo gallery to job details
4. ✅ Add service report download
5. ✅ Test job viewing

**Deliverable:** Clients can view all their jobs and details

---

### **Phase 3: Service Requests (Days 7-9)**
**Goal:** Clients can request new work

**Tasks:**
1. ✅ Create `client-requests.html`
   - Request list
   - New request button

2. ✅ Create `js/client-requests.js`
   - Service catalog fetch
   - Request form modal
   - File upload
   - Submit request

3. ✅ Create request submission logic
4. ✅ Add notification to admins
5. ✅ Test request flow

**Deliverable:** Clients can request new services

---

### **Phase 4: Invoicing (Days 10-12)**
**Goal:** Clients can view and pay invoices

**Tasks:**
1. ✅ Create `client-invoices.html`
   - Invoice list
   - Filters (all, paid, pending, overdue)

2. ✅ Create `js/client-invoices.js`
   - Fetch invoices (filtered by RLS)
   - Invoice detail modal
   - PDF download

3. ✅ Add payment button (if payment processing ready)
4. ✅ Add payment history
5. ✅ Test invoice viewing

**Deliverable:** Clients can view invoices and payment history

---

### **Phase 5: Communication (Days 13-14)**
**Goal:** Clients can message facility managers

**Tasks:**
1. ✅ Create `client-messages.html`
   - Reuse existing messaging UI
   - Filter to show only admin/staff conversations

2. ✅ Update messaging RLS
   - Clients can only message admins/staff
   - Clients can only see their own conversations

3. ✅ Test messaging

**Deliverable:** Clients can communicate with facility managers

---

### **Phase 6: Polish & Testing (Days 15-16)**
**Goal:** Finalize and test everything

**Tasks:**
1. ✅ Add loading states
2. ✅ Add error handling
3. ✅ Mobile responsiveness
4. ✅ Accessibility improvements
5. ✅ End-to-end testing
6. ✅ Performance optimization
7. ✅ Documentation

**Deliverable:** Production-ready client portal

---

## 🧪 **TESTING CHECKLIST**

### **Authentication**
- [ ] Client can log in
- [ ] Client redirected to portal (not admin dashboard)
- [ ] Admin/staff redirected away from portal
- [ ] Logout works correctly

### **Dashboard**
- [ ] Summary cards show correct data
- [ ] Site list shows only client's sites
- [ ] Recent jobs show only client's jobs
- [ ] Upcoming work displays correctly

### **Jobs**
- [ ] Client can view all their jobs
- [ ] Job details modal shows correct info
- [ ] Photos display correctly
- [ ] Service report downloads
- [ ] Filters work correctly

### **Service Requests**
- [ ] Client can create new request
- [ ] Service catalog loads
- [ ] File upload works
- [ ] Request appears in list
- [ ] Admin receives notification
- [ ] Status updates visible to client

### **Invoices**
- [ ] Client can view all invoices
- [ ] Invoice details show correctly
- [ ] PDF download works
- [ ] Filters work (paid, pending, overdue)
- [ ] Payment history displays

### **Security**
- [ ] Client cannot access admin pages
- [ ] Client cannot see other clients' data
- [ ] RLS policies working correctly
- [ ] All queries filtered properly

### **Mobile**
- [ ] Responsive on mobile devices
- [ ] Touch-friendly buttons
- [ ] Mobile navigation works
- [ ] Forms work on mobile

---

## 📊 **SUCCESS METRICS**

### **User Adoption**
- % of clients logging in monthly
- Average sessions per client
- Feature usage (jobs viewed, requests made, invoices paid)

### **Business Impact**
- Reduction in support calls ("where's my invoice?")
- Faster invoice payments
- Increased client satisfaction
- Competitive advantage

### **Technical**
- Page load times < 2 seconds
- Zero security breaches
- 99.9% uptime
- Mobile-friendly score > 90

---

## 🔄 **INTEGRATION POINTS**

### **With Existing Features**
- **Messaging:** Reuse existing messaging system
- **Jobs:** Read-only access to job data
- **Sites:** Filtered by client_id
- **Invoices:** Use existing billing tables
- **Notifications:** Use existing notification system

### **Future Integrations**
- **Payment Processing:** Stripe/PayPal integration
- **Email:** Automated invoice emails
- **Reports:** PDF generation for service reports
- **Calendar:** Sync scheduled work to client calendar

---

## 🎯 **QUICK START GUIDE**

### **Step 1: Database Setup (5 minutes)**
```sql
-- Run ADD_CLIENT_PORTAL_SCHEMA.sql in Supabase SQL Editor
```

### **Step 2: Create Client User (2 minutes)**
```sql
-- Create a test client user
INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  'test-client-uuid',
  'client@example.com',
  'Test Client',
  'client',
  'active'
);
```

### **Step 3: Assign Site to Client (1 minute)**
```sql
-- Assign a site to the client
UPDATE sites
SET client_id = 'test-client-uuid'
WHERE id = 1;
```

### **Step 4: Test Login (2 minutes)**
1. Log in as client
2. Should redirect to `client-portal.html`
3. Should see assigned sites and jobs

---

## 💡 **FUTURE ENHANCEMENTS**

### **Phase 7+ (Future)**
- **Mobile App:** Native iOS/Android app for clients
- **Push Notifications:** Real-time job/invoice updates
- **Client Reviews:** Rate and review completed jobs
- **Service History Analytics:** Charts and trends
- **Document Library:** Contracts, certificates, manuals
- **Multi-Language:** Spanish, French support
- **White Label:** Custom branding per client

---

## 📝 **NOTES**

### **Design Considerations**
- Keep it simple - clients want easy access, not complexity
- Mobile-first - many clients will use phones/tablets
- Professional appearance - reflects on your brand
- Fast loading - don't make clients wait

### **Security Considerations**
- Never trust client input - validate everything
- Use RLS for all queries - don't bypass security
- Log all actions - audit trail
- Regular security reviews

### **Performance Considerations**
- Cache frequently accessed data
- Lazy load images
- Paginate large lists
- Optimize database queries

---

## 🚀 **READY TO START?**

**Recommended Implementation Order:**
1. Phase 1: Foundation (Dashboard)
2. Phase 2: Job Management
3. Phase 3: Service Requests
4. Phase 4: Invoicing
5. Phase 5: Communication
6. Phase 6: Polish & Testing

**Estimated Total Time:** 2-3 weeks (16 days)

**Let's begin with Phase 1!** 🎯

