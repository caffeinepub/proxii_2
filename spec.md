# Proxii — History & Stats Build

## Current State

- App is a single `App.tsx` (~4149 lines) with all logic inline.
- SheetDB API: `https://sheetdb.io/api/v1/m2d47h1nseqog`
- **Column naming just changed** (user confirmed): the `task` and `task_history` sheets now use `poster_id` (was `user_id_origintor`) and `worker_id` (was `user_id_recipient`) everywhere.
- `LiveTask` interface currently uses `user_id_origintor` and `user_id_recipient` — these MUST be renamed to `poster_id` and `worker_id` throughout.
- `TaskHistory` interface currently uses `user_id_origintor` and `user_id_recipient` — same rename needed.
- My Activity section exists; performers see yellow/green badges but "Mark as Completed" just sets status to 'Completed' without the full review/history flow.
- Profile stats (Tasks Posted, Tasks Completed, Total Earned, Rating) are partially live but:
  - 'Tasks Completed' filters `task_history` by `user_id_recipient` (old column) — must switch to `worker_id`
  - 'Total Earned' only counts `payment_status === 'Paid Out'` — must switch to `payment_status === 'Ready for Admin Payout'`
  - 'Rating' reads from the `feedback` tab — must now read `rating_score` from `task_history` where `worker_id` matches
  - Stats drill-down modals exist but are basic — need enhancement per spec
- No `deleteTask` helper exists yet.
- No `postTaskHistory` helper exists yet.
- No rating modal exists yet.

## Requested Changes (Diff)

### Add
1. **Column rename throughout**: `user_id_origintor` → `poster_id`, `user_id_recipient` → `worker_id` in ALL interfaces, state variables, JSX references, SheetDB calls, and filter logic.
2. **`deleteTask(taskId)` helper**: DELETE to `${SHEETDB}/task_id/${taskId}?sheet=task`.
3. **`postTaskHistory(data)` helper**: POST to SHEETDB with `sheet: 'task_history'`.
4. **Performer: 'Mark as Done' → 'Waiting for Poster Review' flow**:
   - Only show button when `payment_status === 'Held by Admin'`.
   - On click: PATCH task status to `'Waiting for Poster Review'`.
   - Show message: 'Work submitted! Waiting for the Poster to review and release your payment.'
   - Hide the Mark as Done button once submitted.
5. **Poster: 'Review & Release Payment' button**:
   - Show in My Activity card when `role === 'Hiring'` AND `task.status === 'Waiting for Poster Review'`.
   - On click: open a **Rating Modal**.
6. **Rating Modal** (new component):
   - 1–5 star selector (visual stars, maps to `rating_score`).
   - Short review text box (maps to `review_text`).
   - 'Release Payment' confirm button.
   - On submit:
     a. POST to `task_history` sheet with columns: `task_id`, `task_name`, `price`, `poster_id`, `worker_id`, `status: 'Completed'`, `completion_date: today's date (YYYY-MM-DD)`, `payment_status: 'Ready for Admin Payout'`, `rating_score`, `review_text`.
     b. DELETE the row from the `task` sheet.
     c. Show toast: 'Task Completed! Admin will now transfer ₹[Price] to the Performer.'
     d. Remove task from local `allTasks` state.
7. **Profile Stats — fully dynamic**:
   - **Tasks Posted**: count rows in `allTasks` (poster_id === userId) + rows in `taskHistory` (poster_id === userId), deduplicated by task_id.
   - **Tasks Completed**: count rows in `taskHistory` where `worker_id === userId`.
   - **Total Earned**: sum `price` in `taskHistory` where `worker_id === userId` (all rows, not just Paid Out).
   - **Rating**: average of `rating_score` column in `taskHistory` where `worker_id === userId`; show 'Unrated' if none.
8. **Stats drill-down modal enhancements**:
   - **Tasks Posted modal**: show task name, status (Completed / In Progress / Active), price.
   - **Tasks Completed modal** (rename to 'Tasks Completed'): show `[Task Name] | [completion_date] | [rating_score ⭐]`.
   - **Total Earned modal** (Earnings Ledger): show task name + ₹amount for each row in `taskHistory` where `worker_id === userId`.

### Modify
- `LiveTask` interface: rename `user_id_origintor` → `poster_id`, `user_id_recipient` → `worker_id`.
- `TaskHistory` interface: rename `user_id_origintor` → `poster_id`, `user_id_recipient` → `worker_id`. Add `review_text?: string`.
- All SheetDB PATCH calls that reference `user_id_recipient` or `user_id_origintor` → update to `worker_id` / `poster_id`.
- `PostedTaskCard` and `HiringActivityCard` components: update all field references to use new column names.
- `patchTask` in select-and-pay: sets `worker_id` (was `user_id_recipient`).
- `ProfileScreen` computed values: update all filter predicates to use `poster_id` / `worker_id`.
- `PostTaskForm`: `user_id_origintor` field in the POST body → rename to `poster_id`.
- `TaskDetailModal`: update `isMyTask` check and all references from `user_id_origintor` → `poster_id`, `user_id_recipient` → `worker_id`.
- `fetchTaskHistory` return type updated for new interface.
- `completedTasks` filter: `t.worker_id === userId` (was `t.user_id_recipient`).
- `totalEarned`: sum ALL rows in taskHistory where `worker_id === userId`, not just 'Paid Out'.
- Rating calculation: read `rating_score` from `taskHistory` (not the `feedback` tab), filtered by `worker_id === userId`.
- Performer 'Mark as Done' onClick: change status to `'Waiting for Poster Review'` (was 'Completed').

### Remove
- Rating reads from the `feedback` tab (`FeedbackRow`, `fetchFeedback`) — still keep the function and type for the TaskDetailModal poster profile rating display, but profile stats rating should now use `task_history.rating_score`.

## Implementation Plan

1. Rename column fields in interfaces (`LiveTask`, `TaskHistory`) and all downstream usages — do a careful global search-replace across the file.
2. Add `deleteTask` and `postTaskHistory` SheetDB helper functions.
3. Update `PostTaskForm` POST body: `poster_id` instead of `user_id_origintor`.
4. Update `TaskDetailModal` field references.
5. Update `PostedTaskCard` / `HiringActivityCard` field references and select-and-pay PATCH.
6. In My Activity performer view: change 'Mark as Done' to PATCH status `'Waiting for Poster Review'`, show submission message.
7. In My Activity poster view (Hiring cards): detect `task.status === 'Waiting for Poster Review'` → show 'Review & Release Payment' button.
8. Build `RatingModal` component with star selector, review text, and 'Release Payment' submit that calls postTaskHistory + deleteTask + updates local state.
9. Update all profile stats computed values (Tasks Posted, Completed, Earned, Rating) to use correct fields and sheets.
10. Update the three drill-down modals to match the new display requirements.
