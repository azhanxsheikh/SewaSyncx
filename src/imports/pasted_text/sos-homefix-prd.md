Design and prototype a **premium, modern emergency home-services web application** called **“SOS HomeFix”**.

The product combines the **polished, trustworthy service-booking experience of Urban Company** with the **speed, urgency, live tracking, and dispatch experience of a ride-hailing application**.

This is a **real product concept**, not a generic landing page. Create a complete responsive web application UI/UX with realistic screens, navigation, states, components, interactions, and clickable prototype flows.

## 1. PRODUCT PURPOSE

SOS HomeFix helps homeowners and renters get immediate professional assistance for urgent household problems such as:

* Electrical failures
* Plumbing emergencies
* AC breakdowns
* Water leakage
* Gas/appliance issues
* Door/lock problems
* Carpentry emergencies
* Other urgent home repairs

The primary experience is **Emergency SOS Dispatch**.

The secondary experience is **normal scheduled home-service booking**.

The design should communicate:

**FAST + TRUSTED + VERIFIED + TRANSPARENT + REASSURING**

Do not make the interface feel like a hospital emergency system or a government emergency service. This is a private home-repair marketplace where urgency is important, but the UI should remain calm, professional, and reassuring.

---

# 2. TARGET USERS

### Customer

Homeowners or renters who need emergency or scheduled home services.

### Family Member

A customer can request emergency help for another saved family member/address.

Example:

“Send an electrician to Dad’s Home”

### Technician

Verified independent service professionals who receive jobs according to:

* Distance
* Skill/category
* Availability
* Emergency priority
* Rating
* Estimated arrival time

---

# 3. CORE DESIGN DIRECTION

Create a design language inspired by premium service marketplaces.

Visual characteristics:

* Clean modern layout
* Generous whitespace
* Soft rounded cards
* Strong visual hierarchy
* Professional typography
* Clear icons
* Subtle shadows
* Premium but accessible appearance
* Trust-focused UI
* High-quality maps
* Clear pricing
* Large primary CTAs
* Minimal unnecessary decoration

Use a **neutral/light base interface** with a strong emergency accent color used strategically for SOS actions and warnings.

Do NOT make the entire interface red.

Emergency elements should feel urgent without creating panic.

Use:

* Large SOS CTA
* Clear status indicators
* Verified badges
* Rating indicators
* Technician identity
* ETA
* Map tracking
* Pricing breakdown
* Confirmation states
* Success states
* Error states
* Loading states

---

# 4. RESPONSIVE DESIGN

Create responsive layouts for:

### Desktop

1440px primary design frame.

### Tablet

1024px.

### Mobile

390px.

The experience must adapt intelligently rather than simply shrinking desktop layouts.

Prioritize mobile usability for the emergency flow because users may be stressed and using the service from their phone.

---

# 5. INFORMATION ARCHITECTURE

Create the following major areas:

### Customer

1. Landing / Home
2. Emergency SOS
3. Emergency Triage
4. Location Selection
5. Family SOS
6. Service Details
7. Photo/Video Upload
8. Pricing & Confirmation
9. Technician Matching
10. Technician Assigned
11. Live Tracking
12. Chat
13. Call Technician
14. Job Completion
15. Digital Bill
16. Payment
17. Rating & Review
18. Booking History
19. Scheduled Services
20. Saved Addresses
21. Family Members
22. Profile
23. Notifications
24. Help & Support

### Technician

Create a separate technician dashboard concept containing:

1. Technician Login
2. Availability Toggle
3. Incoming SOS Request
4. Emergency Request Details
5. Customer Location
6. Job Acceptance
7. Navigation / Route
8. Customer Communication
9. Job Started
10. Job Completed
11. Earnings
12. Job History
13. Profile / Verification

---

# 6. LANDING / HOME SCREEN

Create a premium home dashboard.

Top navigation:

* SOS HomeFix logo
* Home
* Services
* Emergency SOS
* My Bookings
* Family
* Help
* Notifications
* Profile

Hero section:

Headline:

**“Home emergency? Help is on the way.”**

Supporting text:

“Get a verified professional dispatched to your doorstep in minutes.”

Primary CTA:

**🚨 Request Emergency Help**

Secondary CTA:

**Book a Service**

Show a prominent but elegant SOS card.

Example:

“Need help right now?”

[ REQUEST SOS ]

Below the hero, show service categories:

* Electrician
* Plumber
* AC Repair
* Appliance Repair
* Locksmith
* Carpenter
* Water Leakage
* Other

Add:

### Why SOS HomeFix?

* Verified professionals
* Fast emergency dispatch
* Transparent pricing
* Live technician tracking
* Secure payments
* 24/7 support

Also include a small “How it works” section:

**1. Request help → 2. We match a technician → 3. Track arrival → 4. Problem solved**

---

# 7. EMERGENCY SOS FLOW — MOST IMPORTANT

This is the centerpiece of the product.

The entire SOS flow should require minimal cognitive effort.

Flow:

**Home → SOS → Location → Problem → Priority → Evidence → Pricing → Confirm → Matching → Tracking → Completion**

Use a visible progress indicator.

---

# 8. SOS START SCREEN

When the user clicks:

**REQUEST EMERGENCY HELP**

Open an emergency request interface.

Header:

**“What’s happening?”**

Show large service cards:

⚡ Electrical
💧 Plumbing
❄️ AC
🔧 Appliance
🔐 Lock / Door
🪚 Carpenter
🔥 Other Emergency

Each card should have an icon and short description.

---

# 9. PRIORITY / TRIAGE SCREEN

After selecting the category, show:

### “How urgent is this?”

Three clear choices:

### LOW

“Can wait a little while”

### MEDIUM

“Needs attention soon”

### HIGH

“Immediate assistance required”

Use clear descriptions rather than relying only on colors.

Example:

HIGH:

“Active water leakage, electrical hazard, no access to home, or another issue requiring immediate assistance.”

Add a warning:

“Do not attempt dangerous repairs yourself.”

The user should be able to continue without filling a long form.

---

# 10. LOCATION SCREEN

Automatically detect the current location.

Display:

**“Where do you need help?”**

Show an interactive map.

Display:

📍 Current location

Address card:

**Home**
123 Example Street
Greater Noida, Uttar Pradesh

Buttons:

**Use this location**

**Choose another address**

Include saved addresses:

* Home
* Work
* Parents
* Other

Show a small privacy reassurance:

“Your location is shared only with the technician assigned to this request.”

---

# 11. FAMILY SOS FLOW

Create a dedicated option:

**“Request help for someone else”**

Show saved family members:

👨 Dad
📍 Home Address

👩 Mom
📍 Home Address

👵 Grandma
📍 Saved Address

Button:

**+ Add Family Member**

After selecting a family member:

“Help will be dispatched to Dad’s Home.”

Clearly show:

* Person
* Address
* Map
* Contact information
* Emergency service selected

CTA:

**Continue**

---

# 12. PHOTO / VIDEO TRIAGE

Screen title:

**“Help the technician understand the problem.”**

Allow:

📷 Take Photo
🎥 Record Video
⬆ Upload from Device

Show uploaded media as thumbnails.

Add optional question:

“What do you see?”

Example:

* Water leaking
* No electricity
* Strange noise
* Smoke / burning smell
* AC not cooling
* Door won't open
* Other

Do not force users to write long descriptions.

---

# 13. SMART QUESTIONNAIRE

Create a short dynamic questionnaire.

Example for electrical emergency:

**What is affected?**

○ Entire home
○ One room
○ One appliance
○ Not sure

**Is there smoke, sparks, or burning smell?**

○ Yes
○ No
○ Not sure

If “Yes”, show an appropriate safety warning.

Keep the questionnaire short.

Use progressive disclosure rather than showing a giant form.

---

# 14. TRANSPARENT PRICING SCREEN

Before confirmation, clearly show the estimated cost.

Header:

**“Estimated emergency cost”**

Example card:

Technician service
₹499

Emergency dispatch fee
₹149

Estimated total
**₹648**

Show:

“Final cost may change if additional parts or work are required. You will be asked for approval before additional charges.”

Important:

Never hide the emergency fee.

Create a detailed expandable pricing breakdown.

Buttons:

**Confirm Emergency Request**

**Go Back**

---

# 15. EMERGENCY CONFIRMATION

After confirmation, display:

Large SOS confirmation animation.

Headline:

**“Request received.”**

Supporting text:

“We’re finding the nearest verified technician.”

Show:

* Service type
* Priority
* Location
* Estimated arrival time
* Estimated price

Status:

**Finding technician...**

Add subtle animated loading/progress state.

---

# 16. TECHNICIAN MATCHING SCREEN

Create a ride-hailing-inspired matching experience.

Large map.

Show animated technician markers moving toward the customer.

Center card:

**“Finding your technician”**

“Matching based on distance, skill, availability and rating.”

Show estimated match time.

Example:

**Usually less than 60 seconds**

---

# 17. TECHNICIAN ASSIGNED SCREEN

Once matched, show:

Large map with technician route.

Technician card:

### Rahul Kumar

⭐ 4.9
1,284 completed jobs

**Verified Professional**

Badges:

✓ Identity Verified
✓ Skill Verified
✓ Background Checked

Show:

* Distance
* ETA
* Vehicle
* Service category
* Rating
* Number of completed jobs

Primary actions:

**💬 Chat**

**📞 Call**

**Track Technician**

---

# 18. LIVE TRACKING

Create a full tracking screen similar in interaction quality to modern ride-hailing applications.

Map should show:

Customer location
Technician location
Route
Estimated arrival

Bottom sheet:

**Rahul is on the way**

ETA:

**8 min**

Progress:

Assigned → On the way → Arriving → Arrived

Add:

**Call**

**Chat**

**Share Status**

For family SOS, allow the requester to see the technician status remotely.

---

# 19. CHAT

Create an in-app chat interface.

Example automated message:

“Hi Rahul, I’m at the address.”

Technician:

“Hello, I’m arriving in approximately 5 minutes.”

Include:

* Text
* Photo attachment
* Quick replies
* Call button

Quick reply examples:

“Where are you?”

“I’m waiting outside.”

“Please call me.”

---

# 20. ARRIVAL STATE

When technician arrives:

Display:

### “Your technician has arrived.”

Show technician identity card.

Allow:

**Verify Technician**

Show:

* Profile photo
* Name
* Verification badge
* Service
* Rating

CTA:

**Start Service**

---

# 21. JOB IN PROGRESS

Show:

### “Service in progress”

Service:

Electrical Repair

Technician:

Rahul Kumar

Started:

2:42 PM

Include optional status:

Diagnosing issue...

Then:

Repair in progress...

Then:

Repair completed

---

# 22. ADDITIONAL COST APPROVAL

If additional work is required:

Technician sends:

### “Additional work required”

Show:

Original estimate: ₹648

Additional repair: ₹350

New total: ₹998

CTA:

**Approve ₹998**

Secondary:

**Decline**

Never allow the technician to silently increase the final bill.

---

# 23. JOB COMPLETION

Show a strong success screen:

✓

### “Problem solved!”

Service summary:

Electrical Repair

Technician:

Rahul Kumar

Total:

₹998

Buttons:

**View Bill**

**Rate Technician**

---

# 24. DIGITAL BILL

Create a professional invoice.

Include:

SOS HomeFix

Service Invoice

Technician

Service

Date & time

Base service charge

Emergency fee

Parts

Additional work

Taxes if applicable

Total

Payment status:

**PAID**

Button:

**Download Invoice**

---

# 25. RATING & REVIEW

Create a simple rating screen.

### “How was your experience?”

★★★★★

Tags:

* Professional
* Fast
* Polite
* Skilled
* Transparent pricing
* Clean work

Optional text review.

CTA:

**Submit Review**

---

# 26. NORMAL SCHEDULED BOOKING FLOW

This is secondary to SOS.

User can select:

**Book a Service**

Show category grid.

Example:

Cleaning
Electrician
Plumber
AC Repair
Carpenter
Appliance Repair
Pest Control
Painting

After category selection:

Service details → Date → Time → Address → Price → Confirmation.

Example:

### AC Service

Choose date:

Sat, Sep 12

Choose time:

10:00 AM
12:00 PM
2:00 PM
4:00 PM

CTA:

**Book Appointment**

Clearly distinguish:

**Emergency SOS**

from

**Scheduled Service**

---

# 27. CUSTOMER DASHBOARD

Create a polished dashboard.

Top greeting:

**Good afternoon, Abdullah**

Main SOS card:

🚨 Need urgent help?

**Request SOS**

Upcoming booking card.

Recent service card.

Saved family members.

Saved addresses.

Recommended services.

Navigation:

Home
Bookings
SOS
Family
Profile

---

# 28. BOOKING HISTORY

Create cards showing:

Service

Technician

Date

Status

Amount

Example:

Electrical Repair
Rahul Kumar
Sep 5, 2026
Completed
₹998

Actions:

View Bill
Book Again

---

# 29. FAMILY MANAGEMENT

Create:

### My Family

Family member cards with:

Name

Relationship

Saved address

Emergency contact

Button:

**Request SOS**

Allow multiple saved locations.

---

# 30. TECHNICIAN DASHBOARD

Create a separate professional interface.

Header:

**Technician Dashboard**

Availability:

🟢 ONLINE

Toggle:

**Available for Emergency Jobs**

Dashboard statistics:

Today's Jobs
5

Completed
4

Earnings
₹2,450

Rating
4.9

Incoming request card:

### HIGH PRIORITY

Electrical Emergency

Distance:

1.8 km

ETA:

7 min

Estimated earning:

₹499

Buttons:

**Accept Request**

**Decline**

---

# 31. TECHNICIAN REQUEST DETAIL

Show:

Customer name

Service type

Emergency priority

Address

Map

Photos uploaded by customer

Questionnaire answers

Estimated earnings

Estimated distance

Emergency fee

Buttons:

**Accept Job**

**Decline**

---

# 32. TECHNICIAN JOB STATUS

Allow technician to update:

Accepted

On the way

Arrived

Diagnosing

Repairing

Completed

Use a clear timeline.

---

# 33. NOTIFICATIONS

Create notification center.

Examples:

“Rahul has accepted your request.”

“Rahul is 5 minutes away.”

“Your technician has arrived.”

“Additional work requires approval.”

“Your invoice is ready.”

---

# 34. DESIGN SYSTEM

Create a consistent reusable design system.

Typography:

Use a modern sans-serif such as Inter or a similar highly readable font.

Create:

* H1
* H2
* H3
* Body
* Caption
* Button
* Label

Spacing system:

Use consistent 4/8px-based spacing.

Components:

* Buttons
* Cards
* Inputs
* Dropdowns
* Tabs
* Navigation
* Modal
* Bottom sheet
* Toast
* Badges
* Rating
* Technician cards
* Service cards
* Map cards
* Pricing cards
* Status indicators
* Progress indicators

Create reusable components with variants.

---

# 35. BUTTON HIERARCHY

Primary emergency action:

**REQUEST SOS**

Primary standard action:

**BOOK SERVICE**

Secondary:

**Track Technician**

**Chat**

**Call**

Use clear visual distinction between destructive, emergency, primary and secondary actions.

---

# 36. ACCESSIBILITY & UX

Design for stressed users.

Important principles:

* Avoid excessive information
* Keep emergency flow short
* Use clear language
* Use large touch targets
* Do not rely on color alone
* Provide visible focus/selected states
* Make error messages understandable
* Confirm important actions
* Prevent accidental SOS submission
* Make pricing understandable
* Clearly distinguish estimates from final charges
* Show system status at every stage
* Always provide a way to go back

The interface should feel fast without feeling chaotic.

---

# 37. IMPORTANT STATES

Design all important UI states, not only the happy path.

Include:

* Loading
* Empty state
* Error
* Offline
* Location permission denied
* Technician unavailable
* No technicians nearby
* Payment failed
* Upload failed
* Booking cancelled
* Technician cancelled
* Additional cost pending approval
* SOS request cancelled
* Successful completion

Example:

### No Technician Available

“We couldn't find a technician nearby right now.”

Buttons:

**Try Again**

**Schedule a Service**

---

# 38. MICROINTERACTIONS

Add subtle high-quality interactions:

* SOS button press animation
* Card hover
* Button hover
* Loading skeletons
* Technician matching animation
* Map marker movement
* ETA updates
* Status transitions
* Toast notifications
* Modal transitions
* Success animation
* Upload progress
* Rating interaction

Avoid excessive animations.

The emergency experience must remain fast.

---

# 39. PROTOTYPE INTERACTIONS

Make the prototype genuinely clickable.

The following flow MUST work:

HOME
↓
REQUEST SOS
↓
SELECT SERVICE
↓
SELECT PRIORITY
↓
LOCATION
↓
PHOTO/VIDEO
↓
QUESTIONNAIRE
↓
PRICE
↓
CONFIRM SOS
↓
MATCHING
↓
TECHNICIAN ASSIGNED
↓
LIVE TRACKING
↓
CHAT/CALL
↓
TECHNICIAN ARRIVES
↓
SERVICE IN PROGRESS
↓
ADDITIONAL COST APPROVAL
↓
JOB COMPLETED
↓
DIGITAL BILL
↓
PAYMENT
↓
RATING

Also create:

HOME
↓
BOOK SERVICE
↓
CATEGORY
↓
SERVICE
↓
DATE/TIME
↓
ADDRESS
↓
PRICE
↓
CONFIRMATION

And:

HOME
↓
FAMILY
↓
SELECT FAMILY MEMBER
↓
REQUEST SOS
↓
TRACK TECHNICIAN

---

# 40. VISUAL QUALITY TARGET

The final design should look like a **real startup product ready for a design review**, not an AI-generated template.

Aim for the quality level of a modern combination of:

* Premium home-service marketplace
* Ride-hailing dispatch interface
* Modern SaaS dashboard
* Trust-focused fintech-style payment experience

Avoid:

* Generic gradients everywhere
* Excessive glassmorphism
* Random illustrations
* Huge unnecessary text
* Overly decorative UI
* Excessive red
* Cluttered dashboards
* Fake-looking maps
* Inconsistent spacing
* Too many cards
* Tiny buttons

Prioritize usability and product logic over decoration.

---

# 41. CONTENT

Use realistic Indian context.

Currency:

₹ INR

Locations:

Delhi NCR / Greater Noida

Example addresses should look realistic but must not represent real people's private addresses.

Technician names should be realistic Indian names.

Use realistic service prices and ETAs as sample prototype data.

---

# 42. FINAL DELIVERABLE

Generate:

1. Complete responsive website UI
2. Mobile responsive views
3. Customer experience
4. Technician dashboard
5. Emergency SOS flow
6. Family SOS flow
7. Scheduled booking flow
8. Live tracking interface
9. Digital billing
10. Design system
11. Reusable components
12. Empty/error/loading states
13. Interactive prototype
14. Realistic sample content
15. Professional microinteractions

Make the **Emergency SOS flow the hero feature of the entire product**.

The final result should immediately communicate:

**“Something went wrong at home. I can get trusted professional help quickly, know exactly who is coming, track them, and know what I will pay.”**

Do not create only a landing page.

Create the **complete product experience and clickable prototype**.
