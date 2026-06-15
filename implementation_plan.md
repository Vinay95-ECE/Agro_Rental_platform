# Implementation Plan - AgriRent Hub Platform

Build a complete startup-level AgriTech platform called **AgriRent Hub** (MERN stack). This plan documents the steps to convert the single-page prototype into a modular, interactive MERN application.

## User Review Required

> [!IMPORTANT]
> - **Cookie Parser**: The backend requires `cookie-parser` to handle secure JWT tokens in cookies, which is not currently installed or initialized. We will install and configure it.
> - **Redis Fail-Safe Caching**: Since Redis may not be running or installed on the deployment machine, the caching logic will include a fail-safe mechanism that detects connection errors and gracefully falls back to direct MongoDB queries.
> - **Leaflet Geolocation Map**: The tool discovery map will request the browser's geolocation to locate the farmer. If permission is denied or unavailable, it will fallback to New Delhi coordinates `[28.6139, 77.2090]`.

## Open Questions

> [!NOTE]
> - **Razorpay Integration**: We will build a sandbox payment verification flow using Razorpay Checkout in the frontend. When the order is placed, it initiates the Razorpay popup, and upon success, it verifies the payment signature against the backend sandbox API (which generates mock payment IDs).
> - **Voice Notes and Speech Recognition**: We will implement real voice recording using the HTML5 `MediaRecorder` API for chat voice notes, and `webkitSpeechRecognition` for multilingual voice search.

---

## Proposed Changes

### Backend Components

#### [MODIFY] [server.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/server.js)
- Import and configure `cookie-parser`.
- Update socket.io message handlers to:
  1. Retrieve incoming message payloads.
  2. Save messages directly to the `Chat` collection in the database.
  3. Create a corresponding notification in the `Notification` collection.
  4. Broadcast the new message and trigger real-time notifications to the receiver.

#### [MODIFY] [authMiddleware.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/middleware/authMiddleware.js)
- Correctly check cookies for validation via `req.cookies.token` once `cookie-parser` is enabled.

#### [MODIFY] [aiController.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/controllers/aiController.js)
- Import the `DiseaseReport` model.
- Save each crop leaf diagnosis report to the database under the requesting user's ID so it displays in their Dashboard history.

#### [MODIFY] [recommendationService.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/services/recommendationService.js)
- Fix the bug where it attempts to query separate `Seed` and `Fertilizer` collections (they are actually stored in the `Product` collection under `type: 'Seed'` and `type: 'Fertilizer'`).
- Update imports and database queries to use `Product`.

#### [NEW] [wishlistController.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/controllers/wishlistController.js)
- Implement wishlist CRUD handlers: get user wishlist, toggle tool/product/crop in wishlist.

#### [NEW] [notificationController.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/controllers/notificationController.js)
- Implement endpoints to:
  - Get user notifications: `GET /api/notifications`
  - Mark notification as read: `PUT /api/notifications/:id/read`
  - Mark all as read: `PUT /api/notifications/read-all`

#### [NEW] [wishlistRoutes.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/routes/wishlistRoutes.js)
- Define endpoints for managing user wishlists.

#### [NEW] [notificationRoutes.js](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/server/routes/notificationRoutes.js)
- Define endpoints for retrieving and reading user notifications.

---

### Frontend Components

#### [MODIFY] [App.jsx](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/client/src/App.jsx)
- Redefine client routing.
- Integrate global layouts, including the navigation bar (with role selection, language toggle, and notification popover) and the footer.

#### [NEW] [Page Routing & Components](file:///c:/Users/ASUS/OneDrive/Desktop/ewww/client/src/pages)
Create modular page views in React Vite connecting to backend APIs:
- **`Home.jsx`**: Landing page displaying startup features, success stories, and blog logs.
- **`Login.jsx` / `Register.jsx`**: User onboarding with role validation.
- **`Rentals.jsx`**: Machinery rental discovery. Displays tools, Leaflet radius discovery map, spec comparison matrix, Airbnb-style booking calendar, and atomic double-booking validations.
- **`Shop.jsx`**: Seed & Fertilizer catalogs with a dynamic cart tray and sandbox checkout.
- **`Crops.jsx`**: Harvest listings where farmers can upload yield details, and buyers can browse/purchase.
- **`AIAdvisory.jsx`**: Multilingual voice/text chat helper.
- **`DiseaseScanner.jsx`**: Crop leaf scanning simulator connected to pathology analysis.
- **`PricePrediction.jsx`**: Crop pricing analysis showing SVG trend graphs.
- **`Quiz.jsx`**: Agriculture knowledge quiz awarding coins and XP.
- **`Chat.jsx`**: Real-time room communications with voice message simulation.
- **`Dashboards.jsx`**: Glassmorphism dashboards containing 4 unique dashboards (Farmer, Tool Owner, Shopkeeper, Admin).

---

## Verification Plan

### Automated Tests
- We will verify that the server connects to the database and spins up by running `npm run dev` inside `server/`.
- We will verify that the frontend compiles and runs correctly under Vite using `npm run dev` inside `client/`.

### Manual Verification
1. **User Auth & KYC**: Register a user, submit KYC, switch to Admin role, and verify that the Admin dashboard can Approve/Reject the KYC record.
2. **Machinery Bookings**: Create a tool listing, request a booking on specific dates, and verify that selecting overlapping dates blocks the transaction.
3. **Real-time socket.io chat**: Send messages and voice notes between two different roles, verifying read receipts and notification counts.
