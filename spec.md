# Proxii

## Current State
The app has a static UI with three screens (Explore, Post Task, Profile) navigated via a bottom nav bar and header. The Post Task and Profile screens are placeholder stubs with no forms or input fields.

## Requested Changes (Diff)

### Add
- `CompleteProfileScreen`: Full form with fields — Full Name, Telegram Username (with note), Phone Number, UPI ID, College/Student ID. Submit button saves state locally.
- `PostTaskScreen`: Full form with fields — Task Title, Price in ₹, Location/Pickup Point, Deadline (date picker), Detailed Description (textarea). Submit button saves state locally.

### Modify
- Replace `PostTaskScreen` stub with the real interactive form.
- Replace `ProfileScreen` stub with `CompleteProfileScreen` interactive form (preserving the stats display beneath once form is submitted).
- Bottom nav 'Post Task' (+) and header 'Post Task' link already navigate to post screen — ensure they work as designed.
- Bottom nav 'Profile' already navigates to profile screen — ensure it works.

### Remove
- Placeholder "Coming Soon" buttons in both stub screens.

## Implementation Plan
1. Build `CompleteProfileScreen` with controlled inputs, form validation, and a "Save Profile" action that stores data in component state.
2. Build `PostTaskScreen` with controlled inputs including a native date input and textarea.
3. Show a success/confirmation state after each form is submitted.
4. Wire navigation: bottom nav and header tabs already use `setActiveTab`, so no routing changes needed.
