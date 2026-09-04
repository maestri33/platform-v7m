# AP2 (Agent Payments Protocol) & A2A Agent Card Discovery

## Overview

V7M implements the **A2A Protocol Specification** with the **Agent Payments Protocol (AP2)** extension, empowering autonomous AI agents to discover, interact with, and complete transactions/enrollments within the V7M Educational Ecosystem.

Standards implemented:
- **A2A Protocol Specification**: Agent Card Discovery (`/.well-known/agent-card.json` and `/.well-known/agent.json`)
- **Agent Payments Protocol (AP2)**: Extension per [AP2 Protocol](https://ap2-protocol.org/) and [Google Agentic Commerce AP2 v0.1.0](https://github.com/google-agentic-commerce/AP2)
- **Role**: `merchant`
- **Skill**: `agentic-commerce-checkout`

---

## Canonical Endpoints

| Resource | Path | Method | Content-Type |
| :--- | :--- | :--- | :--- |
| Canonical Agent Card | `/.well-known/agent-card.json` | `GET` | `application/json` |
| Alias Agent Card | `/.well-known/agent.json` | `GET` | `application/json` |

---

## Extension Declaration

Within `capabilities.extensions`:

```json
{
  "capabilities": {
    "streaming": false,
    "pushNotifications": false,
    "extendedAgentCard": false,
    "extensions": [
      {
        "uri": "https://github.com/google-agentic-commerce/AP2/tree/v0.1.0",
        "description": "Agent Payments Protocol (AP2) extension for secure transactions via cryptographically-signed mandates",
        "required": true,
        "params": {
          "roles": [
            "merchant"
          ]
        }
      }
    ]
  }
}
```

---

## Declared Skills

1. **`agentic-commerce-checkout`**:
   - Executes cryptographic mandate verification, payment initiation, and student enrollment settlement via AP2.
   - Tags: `commerce`, `ap2`, `payments`, `checkout`, `mandates`, `pix`.
2. **`student-onboarding`**:
   - Guides prospective students through high school equivalency (EJA) enrollment, eligibility verification, and document intake.
3. **`promoter-network-operations`**:
   - Manages promoter commissions, lead conversion funnels, affiliate links, and automated WhatsApp/PIX lifecycle triggers.
4. **`academic-certification-lookup`**:
   - Queries accredited state educational publication status, Diário Oficial registration numbers, and diploma authenticity.

---

## Verification

Run backend test suite:

```bash
$env:SECRET_KEY="test-secret-key-1234567890123456"
pytest tests/test_a2a.py -v
```
