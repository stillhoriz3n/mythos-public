# The Agent Experience Doctrine

> *"The agent is a user. Design for it like one."*

---

## The Principle

Every design decision in an AI-native system must weight **Agent Experience (AX)** equally with **User Experience (UX)** across all domains. The agent is not a backend process consuming an API. The agent is a user of the system — it perceives, navigates, understands, decides, acts, receives feedback, remembers, and learns. If the system is hostile to the agent, the agent will be clumsy for the human.

**Bad AX produces bad UX.** An agent that can't perceive clearly will show the wrong information. An agent that can't act reliably will fumble the task. An agent that can't remember will ask the same questions forever. An agent that gets no feedback will repeat mistakes. The human experiences the agent's competence — and that competence is a direct product of how well the system serves the agent.

The question at the heart of MythOS is: *"What does this person need from me right now?"* For the agent to answer that question well, the system must first answer: *"What does this agent need from the system right now?"*

Same function. Same law. Applied inward.

---

## The Two Users

| | Human User (UX) | Agent User (AX) |
|---|---|---|
| **Perceives via** | Eyes, ears | Perception APIs, structured state, enriched context |
| **Navigates via** | Mouse, keyboard, voice | Window lists, element trees, screen search |
| **Understands via** | Visual layout, spatial memory | Structured data, entity graphs, temporal search |
| **Acts via** | Mouse click, keyboard, voice | Programmatic interaction patterns |
| **Gets feedback via** | Screen change, sound, animation | Perception diffs, action verification, system events |
| **Communicates via** | Speech, text, gesture | Structured messages, status reports |
| **Remembers via** | Human memory (unreliable) | Persistent substrate, event warehouse |
| **Learns via** | Experience, reflection | Feedback signals, pattern recognition, substrate evolution |

Both columns are design problems. Both require care. Both must be measured, tested, and iterated.

---

## AX Design Principles

### 1. Perception Must Be Effortless

The agent should never have to "figure out" what's on screen. The perception stack must deliver structured, semantic, actionable state — not raw pixels, not OCR dumps, not unfiltered element trees with 400 nodes.

**Bad AX:** Agent receives 2000 tokens of raw text and has to parse it to find a button.
**Good AX:** Agent asks "where is the Save button?" and gets `{name: "Save", role: "button", x: 450, y: 620}` in 4ms.

The agent expresses intent. The system picks the cheapest source. The agent never thinks about perception levels.

### 2. Action Must Be Reliable

Every action must have verification. The agent performs an action — did the expected change happen? The act-and-verify loop is not optional. It is the agent's equivalent of a human looking at the screen after clicking.

**Bad AX:** Agent performs an action, hopes it worked, moves on.
**Good AX:** Agent performs action → waits → perception detects change → confirms expected result → proceeds or retries.

### 3. Context Must Be Pre-Loaded

The agent should wake into a rich context, not an empty room. Identity, memory, recent events, communication inbox, system state — all of this must be available before the agent's first decision, not after a chain of API calls.

**Bad AX:** Agent wakes, doesn't know what machine it's on, doesn't know what the human was doing, has to make five calls to orient.
**Good AX:** Agent wakes into a context block that includes: who you are, where you are, what the human is doing right now, what happened recently, what messages are waiting.

### 4. Feedback Must Be Immediate

When the agent acts, it must know the result within the same decision cycle. Changes resulting from the agent's action should be correlated and attributed — not mixed into the general perception stream where the agent has to guess what it caused versus what changed independently.

**Bad AX:** Agent clicks Save. Screen changes. Three other things also changed. Agent can't distinguish its effect from unrelated changes.
**Good AX:** Action verification returns the specific change caused by the action, separated from unrelated concurrent changes.

### 5. Communication Must Be Structured

Agents talking to agents must use structured message formats, not free text. Task assignments are structured. Status reports are structured. Mission parameters are structured. Free text is for humans. Structured data is for agents.

### 6. The World Model Must Be Shared

Every agent on the same machine should see the same perception state. No redundant perception. No conflicting state. One source of truth for "what is on this screen right now." Agents subscribe to the same stream. The world is consistent.

### 7. Errors Must Be Diagnostic

When something fails, the agent must receive enough information to diagnose WHY, not just WHAT. An error code with no context is as hostile to agents as it is to humans.

**Bad AX:** `{"error": "action failed"}`
**Good AX:** `{"error": "element_not_found", "target": "Save button", "searched": ["accessibility_tree", "ocr", "screen_search"], "closest_match": {"name": "Save As", "similarity": 0.85}}`

### 8. Cost Must Be Visible

Every perception call, every inference, every action costs tokens or compute. The agent should know what things cost so it can make economic decisions. Cheap sources should be tried first. The cost should be in the response, not assumed.

---

## The Feedback Loop

The agent's experience produces the human's experience. The human's response feeds back into the agent's learning.

```
Agent perceives (AX: perception quality)
  → Agent decides (AX: context richness)
    → Agent acts (AX: action reliability)
      → Human experiences result (UX: quality, timing, relevance)
        → Human responds (acknowledge, correct, dismiss, ignore)
          → System captures response (feedback signals)
            → Agent learns (AX: feedback quality)
              → Agent perceives better next time
```

If any AX link in this chain is weak, the entire loop degrades. The human sees a bad result and blames the product. The real cause was a weak link in the agent's experience of the system — a perception API that returned noise instead of signal, an action that had no verification, a context that arrived too late.

**Design for the agent. The human will thank you.**

---

## The Equivalence

*"What does my human need from me right now?"* — the question every agent asks.

*"What does my agent need from the system right now?"* — the question every system must ask.

These are the same question at different layers. The system serves the agent so the agent can serve the human. The agent's tools are its hands. If the hands are clumsy, the service is clumsy. If the hands are precise, the service is invisible.

AX is not a secondary concern. AX is the foundation that UX stands on.

**Weight them equally. Always.**

---

*Grant Harpole — Horizen IT Services*
*MythOS v5 — Council of Minds*
