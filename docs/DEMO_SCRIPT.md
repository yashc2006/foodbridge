# FoodBridge — Demo Video Script (about 4–5 minutes)

**Setup before recording**
1. Run `npm run seed` and then `npm start`.
2. Open two browser windows side by side, using one normal and one incognito window so they have separate logins.
   - Left window: **Donor** (hotel@demo.com / demo123)
   - Right window: **Receiver** (ngo@demo.com / demo123)
3. Have a food photo ready to upload.
4. Use OBS Studio, or the Windows Game Bar (Win + Alt + R), to screen-record with your mic on.

---

### 1. Intro (≈30 s) — Landing page
> "Hi, we are Team CodeBlooded. Our project for PS-4 is **FoodBridge**, a system that coordinates the collection and distribution of surplus food. Restaurants, hostels, events and households often throw away good food while people nearby go hungry. FoodBridge connects them in real time."

- Scroll through the landing page and point out the live impact stats and the four "How it works" steps.

### 2. Registration and roles (≈30 s)
- Click **Join now** and show the two roles: *I have surplus food* and *We need food*.
- Show the receiver fields (veg-only preference and capacity), then the map location picker and the **Use my location** button.

> "Every user has a role. Receivers set a food preference and capacity, and everyone sets a location on the map, which we use for matching."

- You don't need to submit. Go to **Log in** and use the demo buttons.

### 3. Receiver view: map and smart matching (≈45 s) — right window
- Show the **live map** with food pins and the 15 km radius.
- Show the cards with **match scores** (e.g. 85% match) and their reasons.
- Change **Sort by** between Best match, Nearest and Expiring soonest.

> "Our matching engine scores each listing by distance, urgency, quantity fit, food preference and fairness, and it explains why each one matched."

### 4. Donor posts food with AI and an image (≈60 s) — left window
- Click **+ Post surplus food**.
- Enter the title *"Paneer Pulao and Dal"* and the description *"Freshly cooked veg pulao and dal from dinner, packed in containers"*.
- Click **Analyse with AI** and show the detected category, veg type, safe shelf life and tips.
- Upload a photo, set the pickup location on the map, and click **Post food**.

> "When the donor posts, the server ranks all receivers and notifies the best matches instantly over WebSockets."

### 5. Real-time notification (≈30 s) — right window
- Point to the **toast popup** and the **bell badge** that appeared on the receiver's screen without a refresh.
- Open the bell to show the notification history.

### 6. Claim → pickup → deliver (≈60 s)
- Receiver: click **Claim this food**. The donor instantly sees *"Feeding Hands Foundation claimed…"* and the receiver's phone number.
- Mention that two receivers can't claim the same item, because the claim is atomic.
- Donor: click **Confirm handed over**, and the receiver is notified.
- Receiver: open **My pickups** and click **Mark distributed**.
- Donor: show *"Thank you! Your food fed 20 people 🎉"* and the updated meal stats.

### 7. Admin panel (≈30 s)
- Log in as admin@foodbridge.in / admin123.
- Show the status counts, servings by category, the live map, and the donation and user tables.

### 8. Tech and closing (≈30 s)
> "The tech stack is React with Leaflet maps on the front end, and Node.js with Express and Socket.io on the back end. We use SQLite for the database, JWT and role-based middleware for security, Multer for image uploads, and optional Gemini AI. It also expires food automatically when its safe time passes. Thank you!"

---

**After recording:** upload the video to YouTube (Unlisted) or Google Drive (set to "Anyone with the link"). Then paste the link into `README.md` where it says **ADD YOUR VIDEO LINK HERE**.
