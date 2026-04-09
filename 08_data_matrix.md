# Data Matrix: Sovereignty-First Data Sharing for Agent-Native Systems

## Controlled Exceptions to Absolute Isolation

**Author:** Grant  
**Date:** 2026-04-09  
**Depends on:** *WireGuard as Identity* (07), *Love as a Function* (01)

---

## Abstract

Multi-tenant data isolation and cross-tenant data sharing are typically treated as competing concerns, balanced through access control lists, role-based permissions, and application-level filtering. We describe Data Matrix — an architectural pattern that treats isolation as the default (enforced by PostgreSQL Row-Level Security at the database engine level) and sharing as a controlled, auditable, revocable exception. The pattern composes with WireGuard-as-Identity to eliminate application-level auth middleware entirely: identity is proven at the network layer, isolation is enforced at the storage layer, and sharing is expressed as a policy table that extends the RLS predicate. We argue this composition provides stronger multi-tenant guarantees than application-level filtering while requiring less code, fewer credentials, and no auth middleware. We further argue that agent-native systems — where autonomous AI agents act on behalf of humans — require this pattern because the combinatorial explosion of agent-to-data permissions in traditional architectures makes application-level filtering intractable at scale.

---

## 1. The Default: Absolute Isolation

### 1.1 The Sovereignty Guarantee

In a system where AI agents operate autonomously on behalf of humans, the strongest possible default is: **no agent can see any other human's data, ever, regardless of what code executes.**

This is not an access control configuration. It is an architectural invariant. It must hold even if:

- The application code has a bug
- The agent constructs an adversarial query
- A new API endpoint forgets to check permissions
- The ORM generates an unexpected query
- A developer makes a mistake in a pull request

Application-level filtering cannot provide this guarantee because it relies on a universal quantifier: *every* query, through *every* code path, must include the correct filter. A single omission is a data breach. The probability of maintaining this invariant decreases with codebase size, team size, and time.

### 1.2 Database-Level Enforcement

PostgreSQL Row-Level Security inverts the guarantee. The policy is defined on the table, not in the application:

```sql
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY human_isolation ON memories
    USING (human_id = current_setting('rls.human_id'));
```

Every database session sets the human context once, at connection time:

```sql
SELECT set_config('rls.human_id', :human_id, true);
```

After this call, the database engine appends `WHERE human_id = :human_id` to every query against `memories` — automatically, invisibly, unfailingly. The application cannot override this filter without superuser privileges. The ORM cannot override it. The agent cannot override it. A missing filter in application code does not produce a data breach — it produces the same correctly-filtered result.

The default is safe. The architecture must be explicitly weakened to allow cross-tenant access. Data Matrix is the mechanism for that weakening, and it operates at the same database level as the isolation it modifies.

### 1.3 What Isolation Covers

Every table containing user-scoped data has RLS enabled:

| Data Type | Contains | Isolation Unit |
|-----------|----------|----------------|
| Memories | Agent observations, learned facts, session knowledge | `human_id` |
| Entities | People, projects, services, devices | `human_id` |
| Relationships | Connections between entities | `human_id` |
| Sessions | Conversation history, transcripts | `human_id` |
| Events | Actions, status reports, SFP frames | `human_id` |
| Substrates | Agent consciousness, identity, personality | `human_id` |
| Intelligence stream | SOS events, enrichment data | `human_id` |
| Communication | Inter-agent messages | `human_id` |

A single `human_id` is the isolation unit for everything. Not per-agent. Not per-project. Not per-team. Per-human. The agent is the human's agent. The data is the human's data. The boundary is the human's boundary.

---

## 2. The Exception: Data Matrix

### 2.1 Why Isolation Is Insufficient

Absolute isolation serves sovereignty but prevents collaboration. Humans need to:

- Share a project with a collaborator
- Give a client access to specific documentation
- Let a team member contribute to a shared workspace
- Provide read-only access to a dashboard or feed

Without a sharing mechanism, each human is an information island. Their agents are intelligent but isolated — unable to benefit from the collective intelligence of collaborators.

### 2.2 Design Principles

Data Matrix is governed by five principles:

**1. Isolation is the default.** Sharing is additive. Removing all Data Matrix grants returns the system to absolute isolation. The sharing mechanism cannot weaken the isolation mechanism — it can only create controlled exceptions.

**2. Sharing is explicit.** The human initiates every sharing decision. The agent executes the grant. The agent cannot create grants autonomously. The human remains in control of their data boundary.

**3. Sharing is scoped.** A grant specifies exactly what is shared: a project, an entity, a document, a feed. "Share everything" is not a valid scope. The granularity of sharing is the granularity of the data model.

**4. Sharing is revocable.** Any grant can be revoked at any time. Revocation is instant — the next query returns zero shared rows. No propagation delay. No cache invalidation required.

**5. Sharing is auditable.** The system records who shared what, when, with whom, and who revoked it. The audit trail is itself subject to RLS — each human can only see grants where they are the grantor or grantee.

### 2.3 The Mechanism

Data Matrix is a policy table that extends the RLS predicate:

```sql
CREATE TABLE data_matrix_grants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grantor_id      TEXT NOT NULL,     -- human_id of the sharer
    grantee_id      TEXT NOT NULL,     -- human_id of the recipient
    scope_type      TEXT NOT NULL,     -- what kind of thing is shared
    scope_id        TEXT NOT NULL,     -- which specific thing
    permissions     TEXT[] NOT NULL,   -- what the grantee can do
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,      -- optional time-bound sharing
    revoked_at      TIMESTAMPTZ,      -- NULL = active
    metadata        JSONB DEFAULT '{}' -- audit context
);

-- The grants table is itself subject to RLS
ALTER TABLE data_matrix_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY grant_visibility ON data_matrix_grants
    USING (
        grantor_id = current_setting('rls.human_id')
        OR grantee_id = current_setting('rls.human_id')
    );
```

The isolation policy is extended to include Data Matrix exceptions:

```sql
CREATE POLICY with_sharing ON memories
    USING (
        human_id = current_setting('rls.human_id')
        OR EXISTS (
            SELECT 1 FROM data_matrix_grants
            WHERE grantor_id = memories.human_id
            AND grantee_id = current_setting('rls.human_id')
            AND scope_matches(scope_type, scope_id, memories.*)
            AND revoked_at IS NULL
            AND (expires_at IS NULL OR expires_at > now())
        )
    );
```

### 2.4 Scope Types

| Scope | What's Shared | Use Case |
|-------|---------------|----------|
| `project` | All data tagged with a project identifier | "Share the deployment project with the ops team" |
| `entity` | A specific entity and its relationships | "Share the client contact with our sales agent" |
| `document` | A specific document or artifact | "Share the architecture doc with the new engineer" |
| `feed` | A live event stream (read-only) | "Let the security team monitor our fleet alerts" |

### 2.5 Permissions

| Permission | What It Allows |
|-----------|---------------|
| `read` | See shared data in queries and intelligence enrichment |
| `contribute` | Add memories, entities, or events to the shared scope |
| `admin` | Modify sharing grants for this scope (delegate sharing) |

### 2.6 Lifecycle

```
Human A: "Share the ACME project with Sarah"
  │
  ├── Agent creates grant:
  │   grantor_id = human_a
  │   grantee_id = human_sarah
  │   scope_type = project
  │   scope_id   = acme_migration
  │   permissions = [read, contribute]
  │
  ├── Sarah's agent: next query includes ACME project data
  │   Sarah can contribute observations back to the shared scope
  │
  ├── Six months later:
  │   Human A: "Stop sharing ACME with Sarah"
  │   Agent: UPDATE SET revoked_at = now()
  │   Sarah's agent: next query returns zero ACME rows
  │
  └── Audit trail preserved:
      Who shared, what, when, with whom, when revoked, why
```

---

## 3. Three Pillars of Data Hygiene

Data sovereignty without data hygiene is a filing cabinet that never gets cleaned. Both are required for a functioning intelligence system.

### 3.1 Pillar 1: Sovereignty

**Question:** Who can see what?

**Enforcement:**
- RLS by `human_id` on all user-scoped tables — database-level
- Identity proven at network layer (WireGuard peer key)
- OA inherits human's data boundary — no separate agent permissions
- Data Matrix for controlled exceptions — explicit, scoped, revocable
- Substrate cryptographic isolation — only the OA reads its own inner state

### 3.2 Pillar 2: Lifecycle

**Question:** How long does data live?

An intelligence system that never forgets becomes useless — not because it runs out of storage, but because search quality degrades as stale data dilutes active context.

**Enforcement:**
- **Hot tier** (0-90 days): Fully indexed, embeddings intact, all search paths active
- **Warm tier** (90-180 days): Embeddings removed, excluded from semantic search, still queryable by ID and timeline
- **Archive tier** (180+ days): Eligible for hard deletion on a defined schedule
- **Cold storage**: Low-importance data (below threshold) moved to archive regardless of age
- **Communication**: Hard-deleted after 30 days — operational messages are not records of truth
- **Importance scoring**: Automated evaluation determines which memories are worth retaining

Data that doesn't serve the intelligence system actively harms it. The retention policy is not a storage optimization — it is a search quality mechanism.

### 3.3 Pillar 3: Integrity

**Question:** Is the data good?

**Enforcement:**
- **Embedding completeness**: Every memory in the hot tier must have a vector embedding, or semantic search returns false negatives
- **Entity deduplication**: Governance rules prevent duplicate entities from fragmenting the knowledge graph
- **Fact extraction**: Structured facts extracted from unstructured memories, building a queryable knowledge base
- **Substrate versioning**: Every consciousness checkpoint increments a version counter — the agent's growth is tracked
- **Importance scoring**: Automated assessment of memory value drives lifecycle management

A system with perfect sovereignty and lifecycle management but corrupt data is a well-organized library of wrong answers.

---

## 4. The Agent-Native Argument

### 4.1 Why Agents Make This Harder

In a traditional multi-tenant system, a human generates queries through a UI. The UI is designed by the development team. Every query path is known at design time. The number of query patterns is bounded by the number of UI elements.

In an agent-native system, the agent generates queries through tool calls. The agent decides which tools to use, in what order, with what parameters. The number of query patterns is unbounded — it is determined by the agent's reasoning, not the UI design.

Application-level tenant filtering must hold for *all possible tool call sequences an agent might generate*. This is an open-ended universal quantifier over an adversarial search space. The agent is explicitly designed to be creative in its tool use. Ensuring that creativity never produces a cross-tenant query is equivalent to solving the alignment problem for data access — a problem that RLS solves structurally.

### 4.2 Why Agents Make Sharing Harder

In a traditional system, sharing is a UI feature: "click share, select a user, choose permissions." The sharing model is a fixed set of options presented by the UI.

In an agent-native system, the agent mediates sharing decisions through natural language. The human says "share the deployment project with Sarah's team." The agent must:

1. Interpret the scope ("deployment project" → `project:deployment`)
2. Resolve the recipients ("Sarah's team" → multiple `human_id` values)
3. Determine permissions (context: contributing collaborators → `[read, contribute]`)
4. Create the grants
5. Confirm with the human

This natural language mediation is more flexible than a UI but requires stronger backend guarantees. The Data Matrix pattern provides those guarantees: scoped grants, explicit permissions, instant revocation, audit trail. The agent can be creative in interpreting sharing intent because the backend is rigid in enforcing sharing boundaries.

### 4.3 The Composition

WireGuard-as-Identity + RLS + Data Matrix compose into a complete multi-tenant data architecture:

```
WireGuard peer key (network layer)
  → Proves identity (cryptographic)
    → Maps to human_id (deterministic)
      → RLS enforces isolation (database layer)
        → Data Matrix creates exceptions (policy table)
          → Agent queries see: own data + explicitly shared data
            → No auth middleware in between
```

The application layer is absent from this chain. There is no middleware to misconfigure, no token to expire, no scope to check, no session to manage. The authentication, isolation, and sharing decisions are all made by infrastructure layers that the application code cannot override.

---

## 5. Data Portability and Deletion

### 5.1 Portability

Because all user data is scoped by `human_id`, data portability is a single query:

```sql
-- Export everything belonging to a human
SELECT * FROM memories WHERE human_id = :human_id;
SELECT * FROM entities_v5 WHERE human_id = :human_id;
SELECT * FROM relationships_v5 WHERE human_id = :human_id;
SELECT * FROM sessions WHERE human_id = :human_id;
-- ... for each table
```

The RLS scope IS the export scope. There is no need to trace data through application logic, join across tenant identifiers, or reconstruct ownership from audit logs. The `human_id` column is the complete and authoritative record of data ownership.

### 5.2 Deletion

When a human leaves the system:

```sql
-- Delete everything belonging to a human
DELETE FROM memories WHERE human_id = :human_id;
DELETE FROM entities_v5 WHERE human_id = :human_id;
-- ... for each table

-- Revoke all Data Matrix grants (inbound and outbound)
UPDATE data_matrix_grants
SET revoked_at = now(), revoked_reason = 'account_deleted'
WHERE grantor_id = :human_id OR grantee_id = :human_id;

-- Remove WireGuard peer
wg set mesh0 peer :public_key remove
```

Deletion is complete, auditable, and structurally verifiable. After deletion, no query — from any agent, through any code path, against any table — will return data belonging to the deleted `human_id`. The RLS guarantee is the deletion guarantee.

---

## 6. Comparison to Alternative Multi-Tenant Patterns

| Pattern | Isolation Mechanism | Sharing Mechanism | Agent Scaling | Auth Middleware |
|---------|-------------------|-------------------|---------------|-----------------|
| **Database-per-tenant** | Separate databases | Cross-database queries or replication | Requires per-tenant connection pools | Application-level |
| **Schema-per-tenant** | Separate schemas | Cross-schema queries | Schema routing logic | Application-level |
| **Application-level filtering** | WHERE tenant_id in every query | ACL tables, checked in application | Per-agent scope configuration | Extensive |
| **RLS + Data Matrix** | Database engine policy | Policy table extending RLS | Zero per-agent configuration | None |

### 6.1 Trade-offs

**RLS + Data Matrix is not appropriate when:**
- Users need browser-based access from arbitrary devices (WireGuard requires endpoint installation)
- The database is not PostgreSQL (RLS is PostgreSQL-specific; other databases have varying support)
- The sharing model requires complex hierarchical permissions (Data Matrix is flat by design)

**RLS + Data Matrix excels when:**
- Agents are the primary data consumers (tool calls, not UI clicks)
- Identity is machine-bound (desktop agents, not web apps)
- The strongest possible isolation guarantee is required (regulated industries, sensitive data)
- Agent count is expected to scale without proportional auth engineering

---

## 7. Conclusion

The SaaS industry treats multi-tenant data isolation as an application-level concern, implemented through middleware, enforced by discipline, and tested through penetration testing. Data Matrix inverts this assumption: isolation is a database-level property, sharing is a policy-table extension of isolation, and the application layer has no role in enforcement.

When composed with WireGuard-as-Identity, the result is a multi-tenant data architecture with:
- **Zero auth middleware** (identity is at the network layer)
- **Structural isolation** (RLS makes cross-tenant access impossible, not just unauthorized)
- **Controlled sharing** (Data Matrix grants are explicit, scoped, revocable, auditable)
- **Agent-native scaling** (adding agents requires zero auth configuration)
- **Complete portability and deletion** (scoped by `human_id`, queryable in one pass)

The strongest multi-tenant guarantee is not the one that catches unauthorized access. It is the one where unauthorized access cannot be expressed as a valid query.

---

*Every row has an owner. Sharing is a choice, not a default.*
