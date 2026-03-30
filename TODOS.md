# TODOS

## Design System
- [x] ~~Run `/design-consultation` to generate complete DESIGN.md~~
  - **Resolved:** DESIGN.md generated with complete color system (light/dark), typography scale (Space Grotesk / IBM Plex Sans / IBM Plex Mono), 8px spacing system, component library (buttons, forms, alerts, REGISTRY cards, map stats, nav), motion rules, and anti-patterns.
  - **Context:** Completed during /design-consultation on 2026-03-26. Competitive research done on Mash SF, State Bicycle, Cinelli, All City Cycles, Surly. Industrial utilitarian aesthetic with REGISTRY (TKID-XXXX) naming system.

## Email Service Selection
- [x] ~~Choose email sending service for approval/rejection notifications~~
  - **Resolved:** Resend (free tier, 3000 emails/month, modern API)
  - **Context:** Decided during /plan-eng-review on 2026-03-27. Only used for approval notifications — rejection emails removed to protect brand relationship.

## Admin Notification
- [ ] Add notification mechanism for new submissions pending review
  - **Why:** If admin doesn't check the dashboard, photos pile up with no one reviewing them. Riders wait indefinitely.
  - **Options:** Daily digest email via Resend ("You have X new photos pending review") | Supabase webhook + Slack notification
  - **Depends on:** Resend integration (already planned)
  - **Context:** Identified during /plan-eng-review outside voice review. Not a launch blocker, but important for operations.

## hCaptcha Fallback
- [ ] Implement graceful degradation when hCaptcha CDN is unavailable
  - **Why:** If hCaptcha CDN goes down, users cannot submit photos at all — high severity failure mode.
  - **How:** Detect hCaptcha load failure → allow submission without captcha → enforce server-side IP rate limiting (5 uploads/hour/IP) as fallback.
  - **Depends on:** Rate limiting implementation in API routes
  - **Context:** Identified during /plan-eng-review failure mode analysis. Should be implemented before launch.
