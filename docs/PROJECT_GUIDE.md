# Facial Automated Attendance Management System

## 🚀 Overview
The **Facial Automated Attendance Management System** is a high-performance, biometric-driven platform designed for modern classroom management. It utilizes advanced AI (face-api.js) to automate attendance logging through facial verification, replacing traditional manual lists with a secure and efficient digital solution.

---

## 🔑 Authentication (ID-Based)
This system uses a simplified, high-security authentication model optimized for academic environments.
- **Login/Registration**: Users (Students & Admins) register using their **Full Name** and **Identification (ID)**.
- **Internal Logic**: The system internally generates a secure Supabase account linked to the ID, removing the need for users to manage emails or complex passwords.
- **Roles**:
  - **Student**: Can register their face, join rooms, and view their attendance history/fines.
  - **Admin**: Can create rooms, set attendance schedules, and monitor real-time logs.

---

## 📸 Facial Recognition Workflow (v2.0)
### 1. Enrollment (GCash-Style)
During signup, students undergo a premium biometric registration process:
- **Live Mesh Scanning**: A real-time face mesh overlay ensures the user is correctly positioned.
- **Manual Shutter**: Users trigger the capture manually when ready, improving photo quality.
- **Precision Cropping**: An interactive UI allows users to zoom and drag their photo to center their face perfectly.
- **Descriptor Generation**: The system processes the image into a **128-dimensional facial descriptor**.
- **Security Check**: Before saving, the system performs a **biometric duplication check** against all registered users to prevent multiple accounts using the same face.

### 2. Verification Terminal
The attendance terminal uses real-time processing:
- Detects faces in the video stream.
- Compares the live face against all registered students in the room.
- Uses a distance-based matching algorithm (threshold: 0.6) to identify the student.
- Automatically logs "Time In" or "Time Out" based on the room's AM/PM scheduling windows.

---

## 🛠️ Administrator Features
### Room & Session Management
- **Complex Scheduling**: Admins can create rooms with specific **AM and PM sessions**, each with its own "Time In" and "Time Out" windows.
- **Access Control**: Generates unique 6-character access codes. Admins must **approve** students who join via code for added security.
- **Auto-Fines**: The system calculates fines (e.g., **₱50**) for students who arrive after the "Time In" deadline or skip required sessions.

### Attendance Analytics
- **Live Monitoring**: Real-time view of attendance logs with student profile details.
- **Absent Tracking**: Automatically identifies students who are expected but have not yet timed in.
- **Manual Corrections**: Admins can edit or delete attendance records to fix manual errors.
- **Fine Management**: Centralized view of total fines accumulated per session.

---

## 🎓 Student Features
### Join & Participate
- **Room Entry**: Students enter the 6-character code and wait for Admin approval.
- **Dashboard**: A personalized view showing current attendance status for the day.
- **History**: A detailed log of all past attendance sessions, including timestamps and any incurred fines.

---

## 🗄️ Database Schema (Public)
- **profiles**: Extended user data (Full Name, Student ID, Course/Year, Face Descriptors, Cropped Face Photo).
- **rooms**: Managed sessions (Name, Code, Admin ID, AM/PM Windows, Event Date).
- **room_participants**: Relationship between students and rooms, including approval status.
- **attendance**: Logging table (Time In, Time Out, Events, Fines).

---

## ⚙️ Technical Stack
- **Frontend**: Next.js 15+ (App Router), Tailwind CSS 4, Shadcn UI, Framer Motion.
- **Backend**: Supabase (Auth, Database, RLS).
- **AI Engine**: face-api.js (SSD Mobilenet v1, Face Landmark 68, Face Recognition).
