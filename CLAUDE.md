# YouTube Playback Reliability Fix

## Context

The current YouTube playback workflow is unreliable.

Examples:

* "Play Believer by Imagine Dragons" sometimes works.
* Sometimes the system gets stuck because multiple relevant videos are found.
* Sometimes the wrong video is selected.
* Sometimes a search page is opened instead of a video.
* Sometimes playback fails entirely.

This issue must be fixed before Calendar, Gmail, Research, or Workflow Engine work.

---

## Critical Instructions

DO NOT:

* create new architecture documents
* create implementation plans
* create TODO lists
* generate pseudocode
* explain what should be done

INSTEAD:

* inspect the existing repository
* find the current YouTube implementation
* modify the existing code
* show actual file changes
* show diffs

---

## Required Investigation

Trace the full execution path for:

"Play Believer by Imagine Dragons"

Identify:

1. Intent parser
2. Query extraction
3. YouTube search implementation
4. Video selection logic
5. Browser opening logic
6. Playback logic

Show actual files and functions.

---

## Required Fixes

### Query Normalization

Convert:

"Open YouTube and search Arijit Singh"

to:

Arijit Singh

Convert:

"Play Believer by Imagine Dragons"

to:

Believer Imagine Dragons

Remove:

* play
* open
* watch
* search
* youtube
* find

before searching.

---

### Video Selection

Do NOT select the first result blindly.

Retrieve multiple results.

Score them.

Prefer:

#### Music

* Official Artist Channels
* Official Music Videos
* Exact Song Matches
* Verified Channels

Avoid:

* reactions
* fan edits
* lyric videos
* reuploads

#### Tutorials

Prefer:

* trusted creators
* recent videos
* high engagement

#### Sports

Prefer:

* official broadcasters
* official leagues
* verified channels

---

### Confidence Logic

Current behavior:

"Many relevant videos found"

This is unacceptable.

Implement:

If top result is clearly better than second result:

Open automatically.

Only ask user when multiple candidates have nearly identical scores.

Never dead-end.

Never stop execution.

---

### Error Handling

Never return:

* Could not identify video
* Multiple videos found
* No exact match

Fallback order:

1. Open best match
2. Show top 3 choices
3. Open YouTube search results

Always provide a path forward.

---

## Debug Output

During testing show:

Query

Normalized Query

Content Type

Top Result

Top Score

Second Score

Selection Reason

Example:

Selected:
Believer - Imagine Dragons (Official Music Video)

Reason:
Official Artist Channel + Exact Match + Highest Confidence

---

## Success Criteria

These commands must work reliably:

* Play Believer by Imagine Dragons
* Play Shape of You
* Play latest F1 highlights
* Play LangGraph tutorial
* Open YouTube and search Arijit Singh

The system should behave like a human choosing the most appropriate video.

---

## Deliverables

After making changes:

1. List modified files.
2. Show diffs.
3. Explain the exact bug that was fixed.
4. Explain why the previous implementation failed.
5. Demonstrate the new execution flow using actual repository code.

Do not provide another implementation plan.

Modify the codebase and report completed changes.
