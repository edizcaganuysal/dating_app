# TODO — Future Improvements

These are planned future features. **Do NOT implement any of these unless explicitly instructed.**

## Selfie Verification
- [ ] Full face matching via AWS Rekognition API (compare selfie to uploaded photos, ~$1/1000 verifications)
- [ ] Liveness detection ML model (detect spoofing with printed photos or screens)

## Matching Algorithm
- [ ] ML-based attractiveness scoring (replace pre-trained model with custom trained on user feedback)
- [ ] Elo score updates from post-date mutual interest signals
- [ ] Collaborative filtering ("users similar to you liked being grouped with users similar to them")
- [ ] Prompt/text embedding similarity (encode prompts into vectors, cosine similarity)
- [ ] Weight optimization — learn optimal weights for scoring components from date outcome data

## Features
- [ ] Credit system (1 free date/week, credits for additional)
- [ ] Event integration (match groups around real local events)
- [ ] Venue booking integration (reserve tables for groups)
- [ ] Push notifications (match reveals, date reminders, chat messages)
- [ ] "Share my plans" safety feature (one-tap share date details with a friend)

## Expansion
- [ ] LGBTQ+ support (non-binary genders, same-gender groups, preference-based matching)
- [ ] Multi-campus support (expand beyond UofT)
- [ ] Multi-city launch
- [ ] Young professionals market (beyond university)

## Tech Debt
- [ ] Move photo storage from local filesystem to S3/Cloudinary
- [ ] Real email sending (replace console OTP logging with SendGrid/Resend)
- [ ] Rate limiting on API endpoints
- [ ] WebSocket reconnection handling improvements
- [ ] Comprehensive E2E mobile tests with Detox
