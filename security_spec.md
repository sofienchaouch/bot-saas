# Security Specification - Firebase Firestore Security Design

This document details the security spec and threat model assessments for the Multi-Tenant WhatsApp Business SaaS platform.

## 1. Data Invariants
- **Multi-Tenant Isolation**: A tenant's configuration, welcome templates, appointments, leads, or knowledge base must belong strictly to that tenant document and accessible only by authenticated users associated with the domain or explicitly linked.
- **Tenant ID Hardening**: Document IDs for tenants must map to unique tenant keys, blocking directory traversals or spoofed requests.
- **Immutability of Core Identifiers**: Key structural fields (`id` for templates, `dateAdded`, or global relational identifiers) cannot be modified after initial creation.
- **Veracity of Conversational History**: Bot logs and customer exchanges cannot be deleted or over-written using invalid message payloads to prevent tampering with historical records.

## 2. The "Dirty Dozen" Payloads (Vulnerable Attack Surface Vectors)

Here are the 12 malicious payloads representing critical vectors aimed at breaching multi-tenant integrity or bypassing business-logic rules:

### Payload 1: Unauthorized Brand Modification (Identity Spoofing)
- **Path**: `/tenants/tenantA`
- **Attempt**: A user logged in as `userX` attempts to overwrite Tenant B's parameters or assign their own account to `tenantB`.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 2: Sandbox Escalation (Bypassing Protection Check)
- **Path**: `/tenants/tenantA`
- **Attempt**: Disabling sandbox constraints to enable live Meta Outbound API calls without verifying active keys.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 3: Lead Status Pollution (State Shortcutting)
- **Path**: `/tenants/tenantA`
- **Attempt**: Manipulating Lead objects in tenant nested fields directly to force status to "Qualified" without going through verification.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 4: Invalid Appointment Booking Time (Temporal Logic Bypass)
- **Path**: `/tenants/tenantA`
- **Attempt**: Creating booking intervals in the past or manipulating calendar timestamps with non-ISO string data.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 5: Large Injection/DoS payload (Denial of Wallet)
- **Path**: `/tenants/tenantA`
- **Attempt**: Overwriting a simple string with a massive 5MB text block to inflate reading/computation costs.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 6: Malformed Knowledge Base Item (Resource Poisoning)
- **Path**: `/tenants/tenantA`
- **Attempt**: Injecting a custom crawl URL with deep execution recursion levels or executable scripts.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 7: Chat History Hijacking (Conversation Tampering)
- **Path**: `/conversations/tenantA_customerB`
- **Attempt**: Spoofing sender credentials or altering existing message entries belonging to a different conversation path.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 8: Immutable Field Overwrite (Privilege Escalation)
- **Path**: `/tenants/tenantA`
- **Attempt**: Modifying tenant registration `createdAt` server time.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 9: Empty ID Poisoning (Shadow Records)
- **Path**: `/tenants/` (with malicious ID containing `..` or special shell symbols)
- **Attempt**: Writing documents with corrupted strings to trigger parsing errors.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 10: Anonymous Writing to Master Tenants (Unauthenticated Access)
- **Path**: `/tenants/tenantA`
- **Attempt**: Modification of core billing or subscription status without signing in.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 11: Mass Deletion / Orphan Writes (System Sabotage)
- **Path**: `/conversations/tenantA_customerB`
- **Attempt**: Direct deletion of history lines of customer interactions.
- **Expected Result**: `PERMISSION_DENIED`

### Payload 12: Admin Claim Spoofing (Role Hijack)
- **Path**: `/tenants/tenantA`
- **Attempt**: Client sending `isAdmin: true` in auth claims inside payload body.
- **Expected Result**: `PERMISSION_DENIED`

---

## 3. The Security Test Runner Plan
All incoming Client writes are locked down, with rules routing read/writes through secure authentication filters. Server-side API endpoints (acting inside Cloud Run sandbox) coordinate secure mutations of Firestore nodes, ensuring unauthenticated direct browser access is fully blocked.
