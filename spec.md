# Proxii – My Activity Poster Flow Update

## Current State
- `PostedTaskCard` component (lines ~2092–2260) renders each task the logged-in user posted, with an expandable applicants list.
- Each applicant shows their `@username` plus an **Accept** button. Clicking Accept shows a green **Confirm** button. Clicking Confirm calls `patchTask` to set `user_id_recipient` and `status: 'Awaiting Payment'`.
- Applicant names are plain `<span>` elements — not clickable links.
- There is no Payment Modal. After selecting a performer, the poster sees nothing further in the UI to confirm payment.
- The `PostedTaskCard` is used inside the **Tasks Posted** stats modal (not inside My Activity directly). My Activity cards are separate read-only cards.
- `LiveTask` interface already has `user_id_recipient`, `payment_status`, `applicants` fields.
- `patchTask` helper exists and works correctly.
- No `upi_username` field is written anywhere.
- **Worker / performer view** in My Activity (role=Working): currently shows "✅ Start Working!" when `payment_status === 'Held by Admin'`, and "Awaiting Admin Verification..." when `payment_status === 'Pending'`. No disabled-state logic for a Start Work button.

## Requested Changes (Diff)

### Add
1. **Telegram link on applicant names** – In `PostedTaskCard`, each applicant's `@username` should be a clickable `<a>` that fetches the applicant's `telegram_id` from the users sheet and opens `https://t.me/{telegram_id}` in a new tab.
   - Fetch via: `GET ${SHEETDB}/search?sheet=users&user_id={applicantId}` — use the existing `fetchUserById` function.
   - On click: call `fetchUserById(applicantId)`, then open the link. Show a brief loading state on the link while fetching.
   - Sanitize: strip leading `@` from telegram_id before building the URL.

2. **'Select & Pay' button** – Replace the existing **Accept → Confirm** two-step with a single **Select & Pay** button per applicant.
   - On click:
     a. Immediately call `patchTask(task.task_id, { user_id_recipient: applicantId, status: 'Awaiting Payment' })`.
     b. Once the patch succeeds, open the Payment Modal.
   - While the patch is in-flight, show a loading/spinner state on the button.
   - Disable the button (and all other applicant buttons) once any performer is selected for this task.

3. **Payment Modal** – A full-screen overlay modal (not the shadcn Dialog; use a fixed overlay div styled to match the dark Midnight theme):
   - **Header**: Admin UPI ID `neelamperween1@okicici` displayed prominently, with a copy icon next to it. Clicking the icon copies the UPI ID to clipboard and shows a "Copied!" toast.
   - **Instruction text**: `Transfer ₹{task.price} to Admin. Once paid, enter your UPI Name below.`
   - **Input field**: Labeled `Your UPI username` — plain text input.
   - **Submit button** labeled `I Have Paid`:
     - On click: call `patchTask(task.task_id, { upi_username: <inputValue>, payment_status: 'Pending Verification' })`.
     - Show loading state while the call is in-flight.
     - On success: close the modal and show a toast `Payment submitted! Awaiting admin verification.`
     - Require non-empty input before submitting.
   - **Close/Cancel**: an `×` button in the top-right corner to close without submitting.
   - The modal state (open/closed + which task) should be local to `PostedTaskCard` via `useState`.

4. **My Activity – Poster card sub-section for applicants ('Hiring' role)**:
   - When `role === 'Hiring'` and applicants exist but no performer is yet selected, show an expandable list of applicants inside the My Activity card (same as PostedTaskCard but inline).
   - Each applicant name is a Telegram link (same logic as above).
   - Each applicant has a **Select & Pay** button with the same behavior (patch + open payment modal).
   - My Activity cards should reuse/lift the `PostedTaskCard` logic, or the My Activity section should simply render a `PostedTaskCard` for each Hiring task instead of its own flat card.

5. **Performer (Working) view update**:
   - When `role === 'Working'` and `payment_status` is NOT `'Held by Admin'`, show: `✅ Hired! Waiting for Admin to verify Poster's payment.`
   - Replace the text-only status with a visible **Start Work** button that is **disabled** unless `payment_status === 'Held by Admin'`.
   - Button label: `Start Work`
   - Disabled styling: reduced opacity + `cursor: not-allowed`.
   - When enabled (payment_status = 'Held by Admin'), the button should be active/clickable (for now it can just show a toast `Let's go! Start your work.`).

### Modify
- `PostedTaskCard`: replace Accept/Confirm two-step with single Select & Pay button, add telegram link to applicant names, add payment modal state.
- My Activity section in `ProfileScreen`: update `role === 'Working'` display and `role === 'Hiring'` applicant list rendering.
- `LiveTask` interface: ensure `upi_username` is typed (add optional field `upi_username?: string`).

### Remove
- The Accept button and the two-step Accept → Confirm pattern in `PostedTaskCard`.
- The `acceptingId` state in `PostedTaskCard` (no longer needed).

## Implementation Plan
1. Add `upi_username?: string` to `LiveTask` interface.
2. Rewrite `PostedTaskCard`:
   a. Remove `acceptingId` state.
   b. Add `paymentModalOpen` state (boolean) and `paymentUpi` input state.
   c. Change applicant `@username` to a clickable element that fetches telegram_id and opens link.
   d. Replace Accept/Confirm with single `Select & Pay` button calling patch then opening modal.
   e. Render payment modal overlay when `paymentModalOpen === true`.
3. Update My Activity `role === 'Working'` block: change status text + add disabled Start Work button.
4. Update My Activity `role === 'Hiring'` block: when applicants exist, render applicant rows with Telegram links and Select & Pay buttons (or embed PostedTaskCard directly).
