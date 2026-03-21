# LoveGenie — Product Document

## Mission

Dating through natural interaction is the healthiest way to form relationships, and it's disappearing. Apps turned dating into a shopping experience — swipe, judge, discard. We're reversing that. LoveGenie gets you off your phone and into a room with real people, doing something fun, where chemistry happens the way it's supposed to.

We don't want you on this app forever. We want you to find someone and leave. That's the opposite of how dating apps make money, and that's the point.

---

## The Problem

Modern dating apps are fundamentally broken, and it's not an accident.

**Swipe fatigue & the paradox of choice.** Tinder gives you infinite options, which sounds great until you realize it makes everyone disposable. Why invest in one person when there's always someone else a swipe away? Studies show more options lead to less satisfaction, more anxiety, and worse decisions.

**The talking stage black hole.** You match with someone. You text for days or weeks. The conversation fizzles, or one person ghosts. You never meet. Most matches on Hinge and Bumble never turn into a single date. The entire process optimizes for chatting, not connecting.

**Safety concerns.** Meeting a stranger from the internet 1-on-1 is inherently risky, especially for women. The anxiety around this is a real barrier to actually going on dates, even when you match with someone promising.

**Commodification of people.** Reducing someone to a few photos and a bio trains your brain to evaluate humans like products. It strips away the things that actually matter — how someone carries themselves, their energy, how they interact with others.

**The profit motive.** This is the big one. Dating apps make money when you stay single. Tinder, Hinge, Bumble — they're publicly traded companies or owned by Match Group. Their revenue depends on monthly subscriptions from lonely people. If everyone found a partner in week one, the business dies. So the algorithm feeds you just enough hope to keep paying, but not enough to actually leave. Features that would genuinely help (seeing who likes you, unlimited swipes, priority placement) are locked behind paywalls. The free experience is deliberately crippled.

**Loneliness is the real crisis.** Gen Z reports the highest levels of loneliness of any generation. University students are surrounded by thousands of potential connections but have fewer tools than ever to actually make them. The apps that were supposed to help are making it worse.

---

## The Solution

Get matched into a group of 4-6 with other students. Go on a group date. Connect with whoever you vibe with after.

No endless swiping. No talking stage. No awkward 1-on-1 with a stranger. You show up to a fun activity with a curated group of people your age, and you see what happens. The group setting removes pressure, creates natural conversation, and lets you see how people actually behave — not how they present themselves in a bio.

After the date, you privately tell the app who you're interested in. If it's mutual, the app connects you. Even if you don't match with anyone romantically, you had a great night out with new people.

---

## User Flow

### 1. Sign Up

- **University verification:** Must use a .edu or recognized university domain (e.g., .utoronto.ca). This keeps the pool trusted and accountable.
- **Real identity:** Real name required. Add phone number (we may call before dates for verification/logistics).
- **Profile:**
  - Upload photos (minimum 3)
  - Age, program/year, short bio
  - Interests from a curated list
  - 5-6 vibe-check questions — light but revealing. Examples:
    - "Friday night: house party or cozy bar?"
    - "How do you feel about pineapple on pizza?"
    - "Road trip or beach vacation?"
    - "Early bird or night owl?"
    - "Cook at home or eat out?"
- **Selfie verification:** During signup, take a live selfie that's compared to your uploaded photos. Prevents catfishing proactively — your group will actually look like their pictures. No surprises.
- **Private section (algorithm only, never shown to other users):**
  - Dating preferences: age range, deal-breakers
  - No self-rating — the ML handles attractiveness scoring silently

### 2. Creating a Date Request

- Pick your **availability**: specific dates + time windows (e.g., "Saturday evening", "Friday after 6pm")
- Choose **group size**: 4 or 6
- Select **activity preferences** from:
  - Curated list (dinner, bar, bowling, karaoke, board game cafe, ice skating, hiking, etc.)
  - Local events happening that week (concerts, campus events, game nights at venues)
  - Users can suggest new activities to add to the curated list (admin-approved)
- **Activity determines matching** — you get grouped with people who chose the same activity. You don't match first and then decide what to do.
- **Pre-group with friends (optional):** Bring 1-2 same-gender friends. If you and your buddy go in as 2 guys, the app finds 2 girls (for a group of 4) or fills a group of 6 with the right balance. Gender split is always equal.

### 3. Matching Window

- Requests sit in a pool. The app runs matching in **batches** — daily at a set time (e.g., 8pm every night for weekend dates, or every Monday for the upcoming week).
- Batch matching creates urgency and a ritual. It also gives the algorithm a bigger pool to optimize over instead of greedy first-come-first-served.
- You get a notification: *"Your group date is set for Saturday 7pm at [Activity]. Here's your group."*

### 4. Pre-Date

- Once matched, you see everyone's **name, photos, program/year, and bio**.
- A **group chat** opens in-app.
- The app **suggests venues** based on the chosen activity and campus proximity. The group can pick from suggestions or decide on something else entirely.
- If someone **backs out**, the app tries to find a replacement from the pool. If it can't, the remaining group can vote to proceed or cancel.

### 5. The Date

- App sends a **reminder notification 2 hours before**.
- A fun **icebreaker prompt** drops in the group chat beforehand — e.g., "everyone share your most controversial food take before tonight."
- They go. They have fun. Natural interaction does the rest.

### 6. Post-Date

Within 24 hours, each person privately:

- **Rates the overall experience** (1-5 stars)
- **Indicates romantic interest** in specific group members (yes/no per person)
- Can mark someone as **"do not match again"** — an explicit block that ensures you're never grouped with them in the future. This is separate from not indicating interest — if you simply don't pick someone, you stay neutral and could be re-matched in a future group.
- Can **flag anyone** for bad behavior

**If two people mutually indicate interest** → the app reveals the match and opens a **1-on-1 chat**. This is the magic moment. The app's job is done — it got you connected. From here, it's up to you two.

**The group chat stays open** after the date. Anyone can propose a follow-up hangout, share socials, or just keep the conversation going. Even without romantic matches, groups often become real friend groups. This is a win the other apps can never offer.

---

## Matching Algorithm

### Step 1 — Hard Filter Clustering

Group users into buckets by:
- Date + time window overlap
- Activity preference (must share the chosen activity)
- Age range overlap (everyone in the group must fall within everyone else's stated range)
- Pre-grouped constraints (friends who must stay together)
- **Never re-match with someone who explicitly chose "do not match again"** (not selecting someone as a romantic interest is neutral — only explicit blocks prevent future grouping)

Users who are too restrictive and can't fit into any bucket get notified to loosen their filters.

### Step 2 — Attractiveness Scoring

Each user gets a score:
- **Initially:** Pre-trained ML model on photos. This isn't about being shallow — it's about making sure group dynamics feel natural and nobody feels out of place.
- **Over time:** Elo-style updates from post-date mutual interest signals. If someone consistently gets picked by their group members, their score goes up. If not, it adjusts down.
- Over time the **Elo signal dominates** over the initial ML estimate, which is more fair and accounts for personality/charisma that photos can't capture.
- Groups are formed so that **attractiveness variance within a group is low** — everyone's roughly in the same band.

### Step 3 — Compatibility Scoring

For every potential pair in the pool, compute a compatibility score based on:
- Interest overlap (from the curated list)
- Vibe-check question alignment
- Program/year similarity (slight bonus, not a hard filter)
- Bio text similarity (LLM embeds both bios into vectors, cosine similarity)
- Past hangout history (if available):
  - Did they rate past group dates highly?
  - What kind of people did they match with before?
  - Collaborative filtering: "users similar to you liked being grouped with users similar to them"

### Step 4 — Group Formation

You have N users in a batch that passed hard filters. You need to form groups of size K (4 or 6) with equal gender split.

```
1. Separate pool into M (male) and F (female) sub-pools
2. For each possible group combination:
   - Compute group_score = min(pairwise_compatibility for all cross-gender pairs)
     weighted by attractiveness_band_similarity
   - Penalize groups with high attractiveness variance
   - Respect pre-group constraints (pairs that must stay together)
3. Constrained optimization:
   - Maximize total group_score across ALL formed groups
   - Subject to: equal gender split, pre-group constraints,
     each user in at most one group
4. For large pools (100+), use greedy heuristic:
   - Sort all possible groups by group_score descending
   - Assign highest-scoring group first
   - Remove assigned users from pool
   - Repeat until pool exhausted or remaining users can't form a valid group
   - Random restarts to escape local optima
5. For small pools (<50), more exhaustive search is feasible
6. Leftover users roll into the next matching batch
```

### Step 5 — Feedback Loop

After each date, ratings and mutual interest data feed back into the system:
- The algorithm learns what "good group chemistry" looks like over time
- Users who consistently get good ratings become higher-value in the matching pool
- Users who no-show or get flagged get deprioritized or banned

### MVP Approach

For launch, **admins manually match users** through the admin dashboard. This lets us:
- Build intuition for what makes good groups before encoding it into the algorithm
- Ensure quality when the pool is small
- Handle the **cold-start pool problem** — with only 100-500 users, hard filters can shrink the matchable pool to near-zero. Manual matching lets us use judgment and bend rules (e.g., slightly relaxing age range or activity preference) when the algorithm would return no valid groups.
- Catch edge cases the algorithm would miss
- The automated algorithm serves as a fallback and gradually takes over as the pool grows

---

## Activity System

Activities are central to LoveGenie — they're not an afterthought, they're the reason the date feels natural instead of forced.

**Curated list per campus:**
Maintained by admins. Examples: dinner, bar hopping, bowling, karaoke, board game cafe, ice skating, hiking, cooking class, trivia night, mini golf, escape room, art gallery, campus event.

**Local event integration:**
Tie into real events happening that week — campus parties, concerts, sports games, festivals, open mic nights. Groups form around actual events, making the experience feel organic.

**User-suggested activities:**
Users can propose new activities. Admin reviews and approves additions to the curated list. This keeps the activity pool fresh and community-driven.

**Group decides in chat:**
As a final option, the group can override and choose their own activity/venue in the group chat after matching. The app's suggestions are a starting point, not a mandate.

---

## Credit System & Monetization

### Philosophy

We are not a dating app that wants your money. We're a group of university students who saw that dating is broken and built something to fix it. We want to run this as cheaply as possible, but we have server costs, and we also need to eat. Every dollar we charge goes toward making the experience better, not toward trapping you in a subscription.

Dating apps are greedy capitalists that intentionally design their product to keep you single and paying. We want you to find someone and delete LoveGenie. That's success for us.

### How It Works

- **1 free date per week.** Every user gets one date request per week at no cost. This is the core experience and it's never paywalled.
- **Credits for additional dates.** Want to go on a second or third date in the same week? Spend credits. Credits can be purchased in small packs.
- **No premium tier that gates the core experience.** Credits are about frequency, not quality. A free user's date is identical to a paying user's date. No priority matching, no "see who liked you" paywall.

### Venue Partnerships

Restaurants, bars, and activity venues pay us for driving group bookings to them. A group of 4-6 university students spending money at your venue every week is valuable. This is our primary revenue stream long-term, and it subsidizes the user experience.

---

## Safety & Accountability

### Natural Accountability

Everyone is on their university email with their real name. You can't hide behind anonymity. If you behave badly, it follows you. This single design decision eliminates most of the toxicity that plagues anonymous dating apps.

### No-Show Policy

| Offense | Consequence |
|---------|-------------|
| 1st no-show (without 24h+ notice) | Warning |
| 2nd no-show | 2-week suspension (can't create requests) |
| 3rd no-show | Account ban |
| Cancel with 24h+ notice | No penalty — app tries to find a replacement |

### Reporting System

Post-date reporting categories:
- Made others uncomfortable
- Inappropriate behavior
- Misrepresented themselves (photos don't match reality)
- Aggressive or pushy behavior

**How reports are handled:**
- Clear-cut violations (pattern of reports, severe single incident) → automated action (suspension/ban)
- Ambiguous cases → admin review. Admin dashboard gets notified with evidence.
- One serious report triggers investigation. Pattern of reports triggers ban.
- University-verified accounts mean **a ban is meaningful** — you can't just make a new account.
- Admin involvement is minimized. We only step in for wrongful reports, disputes, or critical decisions that require human judgment.

### Pre-Date Safety

- **Group setting is inherently safer** than 1-on-1 dates. This is one of our biggest advantages.
- App **suggests public venues only**.
- **"Share my plans" feature:** One-tap share your date details (time, place, group members) with a friend outside the app.

---

## Admin Dashboard

A web-based dashboard for the founding team to manage the platform:

- **Manual matching interface:** View the pool, form groups by hand, override algorithm suggestions
- **Complaint/report management:** Review flagged incidents, see evidence, take action (warn/suspend/ban)
- **User management:** View profiles, handle account issues, verify identities if needed
- **Activity/venue curation:** Manage the curated activity list, approve user-suggested activities, manage venue partnerships
- **Analytics:** Active users, match rates, satisfaction scores, retention, no-show rates

---

## MVP Scope

What we build first for UofT launch:

- **Gender:** Binary M/F with equal splits
- **Campus:** University of Toronto only
- **Matching:** Admin-driven manual matching with basic algorithm as fallback
- **Features:**
  - Sign up with university email verification
  - Profile creation (photos, bio, interests, vibe questions)
  - Date request creation (availability, activity, group size, pre-grouping)
  - Batch matching with group reveal
  - In-app group chat and 1-on-1 chat
  - Post-date feedback (rating, interest indication, reporting)
  - Mutual match reveal
  - Admin dashboard
- **Not in MVP:**
  - LGBTQ+ matching (future expansion)
  - Multi-campus / multi-city
  - Venue booking integration
  - Advanced ML matching (Elo needs data first)
  - Credit system (free during launch to build pool)
  - Event integration

---

## Tech Stack

- **Mobile:** React Native (Expo)
- **Backend:** Python (FastAPI)
- **Database:** PostgreSQL
- **Real-time:** WebSockets (in-app chat, notifications)
- **ML:** Pre-trained photo scoring model, text embeddings for bio similarity
