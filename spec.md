# Proxii – Content Moderation Layer

## Current State
- Post Task form (`PostTaskScreen`) collects Title, Description, Category, Price, Location, Deadline.
- On submit, `handleSubmit` immediately calls `postTask()` to write the row to the `task` sheet with no content screening.
- `ExploreScreen` renders all tasks returned by `fetchTasks()` with no visibility filter.
- `LiveTask` interface has no `is_flagged` field.

## Requested Changes (Diff)

### Add
- `moderateContent(title, description)` pure function that returns `{ verdict: 'ok' | 'block' | 'flag', reason?: string }` based on client-side keyword/pattern matching.
- `is_flagged` field to the `LiveTask` interface.
- Hard-block alert UI in `PostTaskScreen`: a red dismissible banner shown when `verdict === 'block'`; submission is aborted and no API call is made.
- Shadow-flag logic: when `verdict === 'flag'`, the task is posted normally but with `is_flagged: 'True'` written to the sheet.
- Explore feed filter: tasks with `is_flagged === 'True'` are hidden from the public feed (they only become visible once the admin manually sets `is_flagged` to `''` or `'False'` in the sheet).

### Modify
- `handleSubmit` in `PostTaskScreen`: call `moderateContent` before the API call; branch on verdict.
- `ExploreScreen` (and the tasks list passed from App root): filter out tasks where `is_flagged === 'True'`.
- `onTaskPosted` callback in App root: also apply the `is_flagged` filter when prepending the new task to the live feed (shadow-flagged tasks should not appear immediately).

### Remove
- Nothing removed.

## Implementation Plan
1. Add `is_flagged?: string` to `LiveTask` interface.
2. Write `moderateContent(title: string, description: string)` function with:
   - `BLOCK_PATTERNS`: keyword/regex list for clear violations (drugs, weapons, profanity, etc.).
   - `FLAG_PATTERNS`: keyword/regex list for borderline content (suspicious but not certain).
   - Returns `{ verdict: 'block' }`, `{ verdict: 'flag' }`, or `{ verdict: 'ok' }`.
3. In `handleSubmit` (PostTaskScreen):
   - Call `moderateContent` first.
   - If `block`: set `status('error')` + specific moderation error message; return early.
   - If `flag`: proceed with `postTask({ ...fields, is_flagged: 'True' })`.
   - If `ok`: proceed with `postTask({ ...fields, is_flagged: 'False' })`.
4. In the Explore tasks render (App root and ExploreScreen): filter `tasks.filter(t => t.is_flagged !== 'True')` before passing to display.
5. In `onTaskPosted` callback: only prepend the new task to the feed if `is_flagged !== 'True'`.
