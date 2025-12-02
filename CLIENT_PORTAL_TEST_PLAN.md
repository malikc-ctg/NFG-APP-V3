# Client Portal Test Plan

## Overview
This document outlines comprehensive testing procedures for the Client Portal feature. The portal allows clients to view their sites, jobs, invoices, submit service requests, and communicate with staff.

---

## Test Environment Setup

### Prerequisites
- [ ] Supabase database with `ADD_CLIENT_PORTAL_SCHEMA.sql` executed
- [ ] At least one client user account created
- [ ] At least one admin/staff user account created
- [ ] At least one site assigned to a client (`sites.client_id` populated)
- [ ] At least one job created for a client's site
- [ ] At least one invoice created for a client
- [ ] Storage bucket `service-requests` created for photo uploads

### Test Accounts Needed
1. **Client User**: Role = 'client', has assigned sites
2. **Admin User**: Role = 'admin' or 'super_admin'
3. **Staff User**: Role = 'staff'
4. **Client User (No Sites)**: Role = 'client', no assigned sites

---

## 1. Authentication & Routing Tests

### 1.1 Login Redirects
- [ ] **Test Case**: Client user logs in via email/password
  - **Expected**: Redirects to `client-portal.html`
  - **Steps**:
    1. Go to `index.html`
    2. Login with client credentials
    3. Verify redirect to client portal
  
- [ ] **Test Case**: Admin user logs in via email/password
  - **Expected**: Redirects to `dashboard.html` (not client portal)
  - **Steps**: Same as above with admin credentials

- [ ] **Test Case**: Staff user logs in via email/password
  - **Expected**: Redirects to `dashboard.html`
  - **Steps**: Same as above with staff credentials

- [ ] **Test Case**: OAuth login (Google/Microsoft)
  - **Expected**: Redirects based on role after OAuth callback
  - **Steps**:
    1. Click Google/Microsoft sign-in
    2. Complete OAuth flow
    3. Verify correct redirect based on role

### 1.2 Direct URL Access
- [ ] **Test Case**: Client tries to access `dashboard.html` directly
  - **Expected**: Redirected to `client-portal.html`
  - **Steps**: Logged in as client, navigate to `/dashboard.html`

- [ ] **Test Case**: Admin tries to access `client-portal.html` directly
  - **Expected**: Redirected to `dashboard.html`
  - **Steps**: Logged in as admin, navigate to `/client-portal.html`

- [ ] **Test Case**: Unauthenticated user tries to access client portal
  - **Expected**: Redirected to `index.html`
  - **Steps**: Logout, navigate to `/client-portal.html`

### 1.3 Session Management
- [ ] **Test Case**: Client session timeout
  - **Expected**: Redirected to login after session expires
  - **Steps**: Wait for session to expire (or manually invalidate)

- [ ] **Test Case**: Logout functionality
  - **Expected**: Redirected to login page, session cleared
  - **Steps**: Click logout button, verify redirect and session cleared

---

## 2. Client Portal Dashboard Tests

### 2.1 Dashboard Loading
- [ ] **Test Case**: Dashboard loads successfully
  - **Expected**: Shows welcome message, summary cards, recent jobs, sites
  - **Steps**: Login as client, navigate to dashboard
  - **Verify**:
    - Welcome message with client name
    - Summary cards (Total Sites, Active Jobs, Pending Requests, Total Invoices)
    - Recent jobs list
    - Sites overview

- [ ] **Test Case**: Dashboard loads for client with no sites
  - **Expected**: Shows empty state messages
  - **Steps**: Login as client with no assigned sites
  - **Verify**: Appropriate "No sites assigned" messages

### 2.2 Summary Cards
- [ ] **Test Case**: Summary cards display correct counts
  - **Expected**: Accurate counts for sites, jobs, requests, invoices
  - **Steps**: 
    1. Note actual counts in database
    2. Compare with displayed counts
  - **Verify**: All counts match database

### 2.3 Recent Jobs
- [ ] **Test Case**: Recent jobs display correctly
  - **Expected**: Shows last 5 jobs with correct information
  - **Steps**: Verify jobs list
  - **Verify**:
    - Job titles
    - Site names
    - Status badges
    - Scheduled dates
    - Click-through to job details works

### 2.4 Sites Overview
- [ ] **Test Case**: Sites list displays correctly
  - **Expected**: Shows all sites assigned to client
  - **Steps**: Verify sites list
  - **Verify**:
    - Site names
    - Addresses
    - Status indicators
    - Click-through to jobs for that site works

### 2.5 Navigation
- [ ] **Test Case**: All navigation links work
  - **Expected**: Each sidebar link navigates to correct page
  - **Steps**: Click each navigation item
  - **Verify**: Correct pages load

---

## 3. Jobs Viewing Tests

### 3.1 Jobs List
- [ ] **Test Case**: All jobs for client sites display
  - **Expected**: Shows all jobs for sites assigned to client
  - **Steps**: Navigate to Jobs page
  - **Verify**:
    - Only client's jobs are visible
    - Job information is correct (title, site, worker, date, status)
    - Status badges display correctly

- [ ] **Test Case**: Jobs filter by status
  - **Expected**: Filtering works correctly
  - **Steps**:
    1. Click status tab (All, Pending, In Progress, Completed)
    2. Verify jobs list updates
  - **Verify**: Only jobs with selected status are shown

- [ ] **Test Case**: Jobs filter by site
  - **Expected**: Filtering by site works
  - **Steps**:
    1. Open filters
    2. Select a site from dropdown
    3. Verify jobs list updates
  - **Verify**: Only jobs for selected site are shown

- [ ] **Test Case**: Jobs filter by date range
  - **Expected**: Date filtering works
  - **Steps**: Select date range in filters
  - **Verify**: Only jobs in date range are shown

### 3.2 Job Details Modal
- [ ] **Test Case**: Job details modal opens
  - **Expected**: Modal displays with full job information
  - **Steps**: Click on any job card
  - **Verify**:
    - Job title and site name in header
    - Status, scheduled date, type displayed
    - Description displayed
    - Assigned worker information
    - Task checklist displayed
    - Materials used section (if applicable)
    - Photos section (if applicable)
    - Download report button visible

- [ ] **Test Case**: Job details - Task checklist
  - **Expected**: All tasks display with correct completion status
  - **Steps**: Open job details
  - **Verify**:
    - Completed tasks show checkmark
    - Incomplete tasks show empty circle
    - Task descriptions display
    - Completion dates show for completed tasks
    - Photo links work (if task has photo)

- [ ] **Test Case**: Job details - Materials used
  - **Expected**: Materials section shows if job has inventory transactions
  - **Steps**: Open job with materials used
  - **Verify**:
    - Materials section is visible
    - Item names, quantities, units displayed
    - Dates shown correctly

- [ ] **Test Case**: Job details - Photos
  - **Expected**: Photo gallery displays if job has photos
  - **Steps**: Open job with photos
  - **Verify**:
    - Photos section is visible
    - Thumbnails display correctly
    - Clicking thumbnail opens photo viewer
    - Navigation arrows work in photo viewer
    - ESC key closes photo viewer

- [ ] **Test Case**: Job details - Download report
  - **Expected**: Button is visible (functionality can be placeholder)
  - **Steps**: Click download report button
  - **Verify**: Button click doesn't cause errors

### 3.3 Job Access Control
- [ ] **Test Case**: Client cannot view jobs for other clients' sites
  - **Expected**: Job not visible in list
  - **Steps**: 
    1. Create job for site not assigned to test client
    2. Login as test client
    3. Verify job doesn't appear

- [ ] **Test Case**: Direct URL access to other client's job
  - **Expected**: Access denied or redirect
  - **Steps**: Try to access `client-jobs.html?id=<other-client-job-id>`
  - **Verify**: Error message or redirect

---

## 4. Invoices Tests

### 4.1 Invoices List
- [ ] **Test Case**: All client invoices display
  - **Expected**: Shows all invoices for client
  - **Steps**: Navigate to Invoices page
  - **Verify**:
    - Only client's invoices visible
    - Invoice numbers, sites, amounts, dates displayed
    - Status badges correct

- [ ] **Test Case**: Summary cards display correctly
  - **Expected**: Accurate totals
  - **Steps**: Verify summary cards
  - **Verify**:
    - Total Invoices count
    - Paid amount total
    - Pending amount total
    - Overdue amount total

- [ ] **Test Case**: Invoice status filtering
  - **Expected**: Filtering by status works
  - **Steps**: Click status tabs
  - **Verify**: Only matching invoices shown

- [ ] **Test Case**: Invoice date filtering
  - **Expected**: Date range filtering works
  - **Steps**: Select date range
  - **Verify**: Only invoices in range shown

### 4.2 Invoice Details
- [ ] **Test Case**: Invoice details modal opens
  - **Expected**: Full invoice information displayed
  - **Steps**: Click on any invoice
  - **Verify**:
    - Invoice number, site name in header
    - Issue date, due date, status, total displayed
    - Line items table shows all items
    - Totals section shows subtotal, tax, discount, total, paid, balance
    - Download PDF button visible

- [ ] **Test Case**: Invoice line items display
  - **Expected**: All line items shown correctly
  - **Steps**: Open invoice details
  - **Verify**:
    - Item descriptions
    - Quantities and unit prices
    - Line totals calculated correctly

- [ ] **Test Case**: Invoice totals calculation
  - **Expected**: All totals match database values
  - **Steps**: Compare displayed totals with database
  - **Verify**: Subtotal, tax, discount, total, paid, balance all correct

### 4.3 Invoice Access Control
- [ ] **Test Case**: Client cannot view other clients' invoices
  - **Expected**: Invoice not visible
  - **Steps**: 
    1. Create invoice for different client
    2. Login as test client
    3. Verify invoice doesn't appear

- [ ] **Test Case**: Overdue invoices marked correctly
  - **Expected**: Invoices past due date with balance show as overdue
  - **Steps**: 
    1. Create invoice with past due date
    2. Verify status shows as "overdue"
    3. Verify overdue amount in summary card

---

## 5. Service Requests Tests

### 5.1 Request List
- [ ] **Test Case**: All client requests display
  - **Expected**: Shows all service requests for client
  - **Steps**: Navigate to Service Requests page
  - **Verify**:
    - Only client's requests visible
    - Request titles, sites, dates, priorities, statuses displayed
    - Status and priority badges correct

- [ ] **Test Case**: Request status filtering
  - **Expected**: Filtering by status works
  - **Steps**: Click status tabs
  - **Verify**: Only matching requests shown

### 5.2 Create Service Request
- [ ] **Test Case**: New request modal opens
  - **Expected**: Form displays with all fields
  - **Steps**: Click "New Request" button
  - **Verify**:
    - Site dropdown populated with client's sites
    - Service type dropdown shows options
    - Priority dropdown shows options
    - Description textarea present
    - Photo upload input present

- [ ] **Test Case**: Create request - Required fields validation
  - **Expected**: Form validation prevents submission without required fields
  - **Steps**: Try to submit without filling required fields
  - **Verify**: Error messages displayed

- [ ] **Test Case**: Create request - Successful submission
  - **Expected**: Request created and saved to database
  - **Steps**:
    1. Fill all required fields
    2. Optionally upload photos
    3. Submit form
  - **Verify**:
    - Success message displayed
    - Modal closes
    - Request appears in list
    - Request saved in database with correct `client_id`
    - Photos uploaded to storage (if provided)

- [ ] **Test Case**: Create request - Photo upload
  - **Expected**: Photos upload successfully
  - **Steps**:
    1. Select up to 5 photos
    2. Submit request
  - **Verify**:
    - Photos uploaded to `service-requests` bucket
    - Photo URLs stored in `attachments` JSONB field
    - Photos accessible via URLs

### 5.3 Request Details
- [ ] **Test Case**: Request details modal opens
  - **Expected**: Full request information displayed
  - **Steps**: Click on any request
  - **Verify**:
    - Request title, site, status, priority displayed
    - Description shown
    - Created date shown
    - Requested date shown (if provided)
    - Response notes shown (if responded to)
    - Linked job shown (if converted to job)
    - Link to job works (if applicable)

- [ ] **Test Case**: Request details - Response section
  - **Expected**: Response notes display if request was responded to
  - **Steps**: Open request that has response
  - **Verify**:
    - Response notes visible
    - Staff member name shown
    - Response date shown

- [ ] **Test Case**: Request details - Linked job
  - **Expected**: Link to job displayed if request converted to job
  - **Steps**: Open request that was converted to job
  - **Verify**:
    - Linked job section visible
    - Link to job works
    - Clicking link navigates to job details

### 5.4 Request Editing
- [ ] **Test Case**: Client can edit pending requests only
  - **Expected**: Edit only allowed for pending status
  - **Steps**: 
    1. Create request
    2. Try to edit when status is pending
    3. Change status to acknowledged (as admin)
    4. Try to edit as client
  - **Verify**: Edit only works for pending requests

### 5.5 Request Access Control
- [ ] **Test Case**: Client cannot view other clients' requests
  - **Expected**: Request not visible
  - **Steps**: 
    1. Create request for different client
    2. Login as test client
    3. Verify request doesn't appear

---

## 6. Messages Tests

### 6.1 Messages Redirect
- [ ] **Test Case**: Messages page redirects correctly
  - **Expected**: Redirects to main messages page
  - **Steps**: Navigate to `client-messages.html`
  - **Verify**: Redirects to `messages.html`

- [ ] **Test Case**: Messages page accessible to clients
  - **Expected**: Client can access and use messages
  - **Steps**: Use messages functionality
  - **Verify**: Can send/receive messages

---

## 7. Settings Tests

### 7.1 Settings Access
- [ ] **Test Case**: Settings page accessible
  - **Expected**: Settings page loads
  - **Steps**: Navigate to settings
  - **Verify**: Page loads without errors

### 7.2 Client Preferences
- [ ] **Test Case**: Preferences can be saved
  - **Expected**: Preferences saved to `client_preferences` table
  - **Steps**: 
    1. Update notification preferences
    2. Save
  - **Verify**: Preferences persisted in database

---

## 8. Row Level Security (RLS) Tests

### 8.1 Sites RLS
- [ ] **Test Case**: Client can only view own sites
  - **Expected**: Only sites with matching `client_id` visible
  - **Steps**: Query sites as client user
  - **Verify**: Only client's sites returned

- [ ] **Test Case**: Admin can view all sites
  - **Expected**: All sites visible to admin
  - **Steps**: Query sites as admin user
  - **Verify**: All sites returned

### 8.2 Jobs RLS
- [ ] **Test Case**: Client can only view jobs for own sites
  - **Expected**: Only jobs for client's sites visible
  - **Steps**: Query jobs as client user
  - **Verify**: Only jobs for client's sites returned

- [ ] **Test Case**: Admin can view all jobs
  - **Expected**: All jobs visible to admin
  - **Steps**: Query jobs as admin user
  - **Verify**: All jobs returned

### 8.3 Invoices RLS
- [ ] **Test Case**: Client can only view own invoices
  - **Expected**: Only invoices with matching `client_id` visible
  - **Steps**: Query invoices as client user
  - **Verify**: Only client's invoices returned

### 8.4 Service Requests RLS
- [ ] **Test Case**: Client can only view own requests
  - **Expected**: Only requests with matching `client_id` visible
  - **Steps**: Query requests as client user
  - **Verify**: Only client's requests returned

- [ ] **Test Case**: Client can only create requests with own `client_id`
  - **Expected**: Cannot set `client_id` to different user
  - **Steps**: Try to create request with different `client_id`
  - **Verify**: Request rejected or `client_id` auto-set to current user

### 8.5 Bookings RLS
- [ ] **Test Case**: Client can only view bookings for own sites
  - **Expected**: Only bookings for client's sites visible
  - **Steps**: Query bookings as client user
  - **Verify**: Only bookings for client's sites returned

---

## 9. Mobile Responsiveness Tests

### 9.1 Mobile Navigation
- [ ] **Test Case**: Mobile sidebar works
  - **Expected**: Hamburger menu opens/closes sidebar
  - **Steps**: Test on mobile device or resize browser
  - **Verify**: Sidebar toggles correctly

- [ ] **Test Case**: Mobile menu links work
  - **Expected**: All navigation links work on mobile
  - **Steps**: Click each link in mobile menu
  - **Verify**: Correct pages load

### 9.2 Mobile Layout
- [ ] **Test Case**: Dashboard responsive on mobile
  - **Expected**: Layout adapts to small screens
  - **Steps**: View dashboard on mobile
  - **Verify**: No horizontal scrolling, readable text

- [ ] **Test Case**: Jobs list responsive
  - **Expected**: Job cards stack vertically on mobile
  - **Steps**: View jobs on mobile
  - **Verify**: Layout works on small screens

- [ ] **Test Case**: Modals responsive
  - **Expected**: Modals display correctly on mobile
  - **Steps**: Open job/invoice/request details on mobile
  - **Verify**: Modals are scrollable, buttons accessible

---

## 10. Error Handling Tests

### 10.1 Network Errors
- [ ] **Test Case**: Handle network timeout
  - **Expected**: Error message displayed
  - **Steps**: Simulate network timeout
  - **Verify**: User-friendly error shown

- [ ] **Test Case**: Handle offline state
  - **Expected**: Offline indicator or message
  - **Steps**: Go offline
  - **Verify**: Appropriate offline handling

### 10.2 Database Errors
- [ ] **Test Case**: Handle missing data gracefully
  - **Expected**: Empty states displayed instead of errors
  - **Steps**: View page with no data
  - **Verify**: Empty state messages shown

- [ ] **Test Case**: Handle permission errors
  - **Expected**: Access denied message
  - **Steps**: Try to access restricted resource
  - **Verify**: Clear error message displayed

### 10.3 Validation Errors
- [ ] **Test Case**: Form validation errors
  - **Expected**: Clear error messages
  - **Steps**: Submit invalid forms
  - **Verify**: Specific error messages shown

---

## 11. Performance Tests

### 11.1 Load Times
- [ ] **Test Case**: Dashboard loads within 2 seconds
  - **Expected**: Page interactive within 2 seconds
  - **Steps**: Measure load time
  - **Verify**: Meets performance target

- [ ] **Test Case**: Jobs list loads quickly
  - **Expected**: Large job lists load efficiently
  - **Steps**: Test with 100+ jobs
  - **Verify**: Pagination or lazy loading works

### 11.2 Database Queries
- [ ] **Test Case**: Efficient queries
  - **Expected**: Queries use indexes
  - **Steps**: Check query execution plans
  - **Verify**: Indexes used for filtering

---

## 12. Browser Compatibility Tests

### 12.1 Modern Browsers
- [ ] **Test Case**: Chrome (latest)
  - **Expected**: All features work
  - **Steps**: Test all functionality
  - **Verify**: No errors

- [ ] **Test Case**: Firefox (latest)
  - **Expected**: All features work
  - **Steps**: Test all functionality
  - **Verify**: No errors

- [ ] **Test Case**: Safari (latest)
  - **Expected**: All features work
  - **Steps**: Test all functionality
  - **Verify**: No errors

- [ ] **Test Case**: Edge (latest)
  - **Expected**: All features work
  - **Steps**: Test all functionality
  - **Verify**: No errors

### 12.2 Mobile Browsers
- [ ] **Test Case**: iOS Safari
  - **Expected**: Works on iOS
  - **Steps**: Test on iPhone/iPad
  - **Verify**: No issues

- [ ] **Test Case**: Android Chrome
  - **Expected**: Works on Android
  - **Steps**: Test on Android device
  - **Verify**: No issues

---

## 13. Security Tests

### 13.1 XSS Prevention
- [ ] **Test Case**: Script injection in text fields
  - **Expected**: Scripts not executed
  - **Steps**: Enter `<script>` tags in forms
  - **Verify**: Content escaped/ sanitized

### 13.2 SQL Injection
- [ ] **Test Case**: SQL injection attempts
  - **Expected**: Queries safe
  - **Steps**: Use parameterized queries (verify in code)
  - **Verify**: No raw SQL with user input

### 13.3 CSRF Protection
- [ ] **Test Case**: CSRF token validation
  - **Expected**: Unauthorized requests rejected
  - **Steps**: Test form submissions from external sites
  - **Verify**: CSRF protection in place

---

## 14. Integration Tests

### 14.1 End-to-End Workflows
- [ ] **Test Case**: Complete client journey
  - **Steps**:
    1. Client logs in
    2. Views dashboard
    3. Checks jobs
    4. Views invoice
    5. Submits service request
    6. Receives response
    7. Views updated request
  - **Verify**: All steps complete successfully

- [ ] **Test Case**: Admin-client interaction
  - **Steps**:
    1. Admin creates job for client's site
    2. Client views job in portal
    3. Admin updates job status
    4. Client sees updated status
  - **Verify**: Real-time updates work (if implemented)

---

## Test Execution Checklist

### Pre-Testing
- [ ] Test environment set up
- [ ] Test accounts created
- [ ] Test data populated
- [ ] SQL schema executed successfully

### During Testing
- [ ] Use checklist above
- [ ] Log all bugs found
- [ ] Take screenshots of errors
- [ ] Document any unexpected behavior

### Post-Testing
- [ ] All critical bugs fixed
- [ ] Retest fixed bugs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation updated

---

## Bug Report Template

When logging bugs, include:
- **Test Case ID**: (e.g., 1.1)
- **Severity**: Critical / High / Medium / Low
- **Steps to Reproduce**: Detailed steps
- **Expected Result**: What should happen
- **Actual Result**: What actually happened
- **Screenshots**: If applicable
- **Browser/Device**: Testing environment
- **Console Errors**: Any JavaScript errors

---

## Success Criteria

The Client Portal is considered ready for production when:
- [ ] All critical test cases pass
- [ ] No high-severity bugs remain
- [ ] RLS policies correctly restrict access
- [ ] Mobile responsive on major devices
- [ ] Performance meets targets (< 2s load time)
- [ ] Security tests pass
- [ ] User acceptance testing completed

---

## Notes

- Test with real client data scenarios when possible
- Pay special attention to RLS policies - they're critical for security
- Test edge cases (empty states, large datasets, etc.)
- Verify all redirects work correctly
- Test photo upload functionality thoroughly
- Ensure proper error messages throughout

