# 🎬 5-Minute Promotional Video Script & Project Pitch
## Project: Facial Recognition Monitoring Attendance System (FRMAS)

This script is structured starting with the **Project Summary as the ultimate presentation hook**, followed by the Project Title, Profile, Agency, Work Plan, and User Interface Prototype in exact order.

---

## 📝 1. Project Summary
* **The Problem**: Traditional attendance tracking is a chaotic struggle. Paper logs get lost, slow manual sign-ins cause massive bottlenecks, and proxy cheating like buddy-punching compromises data integrity.
* **The Solution**: **FRMAS** automates and digitizes the entire session lifecycle. It replaces this outdated friction with instant, contactless biometrics, providing:
  1. A premium, consumer-fintech **biometric enrollment** page with real-time face tracking, **Retake Photo** capabilities, and compliance guidelines.
  2. A **Room Joining system** where students enter generated **Room Codes** to request entry.
  3. A **hands-free biometric terminal** where students **choose their Room from the menu** to clock in with zero latency.
  4. Integrated **AI Voice Feedback** for contactless auditory confirmations.
  5. A **Student Personal Dashboard** where students can see all the event rooms they have joined, and view their real-time **Time In** and **Time Out** log stamps.
  6. An **Admin Master Dashboard v2.0** that automates room scheduling, **Manage Students approvals**, live logs, and **auto-calculated fines (₱50 per absence)** to streamline bookkeeping.

---

## 🚀 2. Project Title
**Facial Recognition Monitoring Attendance System (FRMAS)**

---

## 📊 3. Project Profile
* **Target Environment**: High-Throughput Educational Institutes, Corporate Offices, and Seminar Halls.
* **Core User Roles**: 
  - **Administrators**: Control virtual rooms, define session windows, approve student access, and manage automated fines.
  - **Students**: Securely authenticate, enroll premium biometrics, join event rooms, and monitor individual history/fines.
* **Core Tech Stack**: 
  - **Framework**: Next.js 15+ (App Router, App-Store Performance)
  - **Database & Security**: Supabase (PostgreSQL, Row Level Security, pgvector)
  - **Biometrics & AI**: Face-api.js (SSD Mobilenet v1 & TinyFace Detector)
  - **Styling & Animations**: Tailwind CSS 4 (Premium Dark Aesthetic) + Framer Motion 12
* **Platform**: Fully responsive Web App (starts at 375px with specialized hands-free terminal mode).

---

## 🏢 4. Agency
* **Agency Name**: **Christian Dev Labs**
* **Focus Area**: High-performance full-stack web applications, edge AI biometric matching, and secure cloud database integration.
* **Core Principles**: High aesthetic standards, type-safe security, and zero-latency user experiences.

---

## 🗓️ 5. Work Plan
* **Phase 1: Architecture & Security Design**
  - Initialize Next.js 15 project structure with Tailwind CSS 4.
  - Configure Supabase database, write strict Row Level Security (RLS) policies, and install the `pgvector` extension for mathematical face embedding storage.
* **Phase 2: Student Enrollment Engine (with Retake Options)**
  - Integrate Face-api.js for browser-side facial feature detection.
  - Build the circular webcam preview with real-time posture scanning and 0-100% progress ring.
  - Implement pixel-perfect cropping, zoom, and server-side biometric deduplication checks.
* **Phase 3: Admin Setup & Student Room-Joining**
  - Create Room creation panel with AM/PM session parameters.
  - Generate copyable Room/Event Codes.
  - Develop Student Join form with custom Room Code validation.
* **Phase 4: Approvals, Terminal Clock-In, Student Dashboard & Logs**
  - Implement student request approvals badge system inside created Rooms.
  - Connect terminal dropdown with active approved Rooms.
  - Develop student-facing personal logs showing active event rooms, and real-time Time In / Time Out log stamps.
  - Build the live student registry table, showing auto-calculated fines (₱50) and manual overrides.

---

## 🖥️ 6. User Interface Wireframe / Design / Prototype (Chronological Demo Script)

### 🏁 Scene 1: Introduction (0:00 - 1:00)
* **Visual Cues**: 
  - Smooth screen recording of the FRMAS landing page. Highlight the premium dark aesthetic, vibrant blue gradient glow, and sleek login cards with Framer Motion hover states.
  - Pop up an overlay listing the technology stack (Next.js 15, Supabase, Face-api.js) and Christian Dev Labs branding.
* **Director Instructions**: Center mouse movements. Keep transitions slow.

---

### 🤳 Scene 2: Student Sign-In & Facial Registration (1:00 - 2:30)
* **Visual Cues**:
  - Open the student sign-up / login card.
  - Type student details: **Full Name**, **Student ID**, and **Course, Year, and Section** into the input fields. Click **"Register Face"**.
  - Show the **Face Registration Intro Screen** with floating guidelines: *"No glasses / No mask"*.
  - Tap **"Start Enrollment"**. The browser activates the webcam inside a circular camera frame with blue corner brackets.
  - Position face inside frame. Watch the **Auto-Capture Progress Circle** wrap around the camera frame, ticking from 0% to 100% with the label **'FACE DETECTED - STAY STILL'**.
  - At 100%, show a camera flash animation and transition to the **Crop & Zoom Screen**.
  - Slide the **Zoom Slider** (1x to 3x) and show clicking the **"Retake Photo"** button if they want to capture again.
  - Drag the image inside the crop frame, click **"Apply & Continue"**, and click **"Confirm Registration"**. Show the green success card with a checkmark: `"Profile updated successfully!"`.

---

### 🛡️ Scene 3: Admin Room Setup & Student Joining (2:30 - 3:20)
* **Visual Cues**:
  - Log into the **Admin Master Dashboard (v2.0)** showing the modern dark control center.
  - Go to **Room Management** -> Click **"Create or Launch Room plus event"**.
  - Fill in the **Room Name** and **Event Name** input fields, select a category dropdown (e.g., **University Event**), and toggle **AM** and **PM session windows**.
  - Click **"Save"**. Watch the room card appear with its unique generated **Room Code**.
  - Click the **copy-icon** next to the Room Code to copy it.
  - Switch back to the **Student View**, navigate to the Room Join field, paste the Room Code, and click **"Join Room"** to submit an entry request.

---

### 👥 Scene 4: Approving Students in Created Rooms (3:20 - 4:00)
* **Visual Cues**:
  - Log back into the **Admin Dashboard** and open the active Room to **Manage Students**.
  - Click into the Room's **Approvals Tab**. Locate our newly joined student currently flagged with an **'Awaiting Approval'** badge.
  - Click the **"Approve"** button on their student card. Watch the badge transition instantly to a green **'Approved'**.

---

### 🕒 Scene 5: Facial Attendance Terminal Check-In & Student Personal Dashboard (4:00 - 4:40)
* **Visual Cues**:
  - Switch to the **Facial Attendance Terminal** page.
  - Click the Room dropdown menu and **select our newly created event Room** from the menu, then set the session toggle.
  - Click **"Start Authentication"** to activate the webcam stream inside blue corner brackets.
  - Step into the frame. Watch the progress circle wrap to 100% with facial tracking guidelines.
  - At 100%, show the green success overlay card: `"Time In Successfully!"` with the student's name.
  - **Audio Check**: Ensure system audio is on so the browser voice announces *"Time In Successful"*.
  - Transition immediately to the **Student Personal Dashboard** page.
  - Hover over the **Joined Events** list and point cursor to the live **Time In** and **Time Out** attendance stamps, showing the updated check-in history.

---

### 📊 Scene 6: Admin Logs, Fines & Outro (4:40 - 5:00)
* **Visual Cues**:
  - Return to the Admin Dashboard under our created Room.
  - View the live table of Present, Absent, and Tard logs with columns: Name, ID, Course/Section, Session, and Status.
  - Focus on the **Fines Column**, pointing out an absent student with an auto-calculated ₱50 penalty for an absent session.
  - Click a manual override button to demonstrate excusing an absence or adjusting logs in a single click.
  - Transition to a stunning final closing slide with Christian Dev Labs closing credits and your repository link before fading out.
