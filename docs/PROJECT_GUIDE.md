# Facial Recognition Attendance System

## 🚀 Overview
The **Facial Recognition Attendance System** is a high-performance, biometric-driven platform designed for modern classroom management. It utilizes advanced AI (face-api.js) to automate attendance logging through facial verification, replacing traditional manual lists with a secure and efficient digital solution.

---

## 🔑 Authentication (ID-Based)
This system uses a simplified, high-security authentication model optimized for academic environments.
- **Login/Registration**: Users (Students & Admins) register using their **Full Name** and **Identification (ID)**.
- **Internal Logic**: The system internally generates a secure Supabase account linked to the ID, removing the need for users to manage emails or complex passwords.
- **Roles**:
  - **Student**: Can register their face, join rooms, and view their attendance history/fines.
  - **Admin**: Can create rooms, set attendance schedules, and monitor real-time logs.

---

## 📸 Facial Recognition Workflow
### 1. Registration
During signup, students are prompted to register their face. The system:
- Captures a high-resolution face image via the webcam.
- Processes the image into a **128-dimensional facial descriptor**.
- Stores only the numeric descriptor (embedding) in Supabase, ensuring maximum privacy (no raw images are stored).

### 2. Verification Terminal
The attendance terminal uses real-time processing:
- Detects faces in the video stream.
- Compares the live face against all registered students in the room.
- Uses a distance-based matching algorithm (threshold: 0.6) to identify the student.
- Automatically logs "Time In" or "Time Out" based on existing records for the day.

---

## 🛠️ Administrator Features
### Room Management
- **Room Creation**: Admins create rooms with unique 6-character access codes.
- **Scheduling**: Set specific **Start** and **End Times** for each session.
- **Auto-Fines**: The system automatically calculates a **₱50 fine** for students who arrive after the scheduled Start Time.

### Attendance Dashboard
- **Real-time Logs**: View who is currently present.
- **Student Profiles**: Display Full Name, Student ID, and Course/Year.
- **Event Tracking**: Automatic labeling of events like "Late" or "Active".
- **Fine Tracking**: Centralized view of total fines accumulated per session.

---

## 🎓 Student Features
### Join & Participate
- **Room Entry**: Students enter the 6-character code provided by the Admin.
- **Dashboard**: A personalized view showing current attendance status.
- **History**: A detailed log of all past attendance sessions, including timestamps and any incurred fines.

---

## 🗄️ Database Schema (Public)
- **profiles**: Extended user data (Full Name, Student ID (e.g., 231-0726), Course/Year, Face Descriptors).
- **rooms**: Managed sessions (Name, Code, Admin ID, Schedule).
- **room_participants**: Relationship between students and the rooms they've joined.
- **attendance**: Logging table (Time In, Time Out, Events, Fines).

---

## ⚙️ Technical Stack
- **Frontend**: Next.js 15+ (App Router), Tailwind CSS, Shadcn UI.
- **Backend**: Supabase (Auth, Database, RLS).
- **AI Engine**: face-api.js (SSD Mobilenet v1, Face Landmark 68, Face Recognition).
