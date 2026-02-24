# Backlog

Ideas and features to implement.

---

## Planned Features

### 1. Optional Brainstorming Chat
Add a brainstorming mode where the user can flesh out an idea before starting implementation. The conversation output gets saved to `/planning/BRAINSTORM.md` inside that project for reference.

### 2. Pinned Chats / Agents
Allow users to pin persistent, role-based chat agents to a project. Each pinned agent has a defined role, context scope, and set of capabilities it can perform autonomously.

**Example — Project Manager Agent:**
- **Context:** Reads architecture docs, README, and backlog on every conversation start to stay aware of current project state
- **Capabilities:**
  - Answers general questions about the project (structure, status, conventions)
  - Helps brainstorm and evaluate new feature ideas
  - Adds, updates, and removes items in `BACKLOG.md`
  - Updates architecture and README docs when the project changes
- **Behavior:** Acts as a knowledgeable collaborator who always knows what's going on in the project — no need to re-explain context each time

Other potential pinned agents could include a Code Reviewer, a QA Tester, a DevOps agent, etc. The key idea is persistent role + automatic context loading so the agent is always "up to speed."
