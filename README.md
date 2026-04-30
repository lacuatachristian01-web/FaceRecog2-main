# 🚀 Facial Automated Attendance Management System

A high-performance attendance management system built with **Next.js 15**, **Supabase**, and **Face-api.js**. Designed for educational and corporate environments to automate attendance tracking using secure facial recognition.

## 📌 Project Overview

This system allows students to register their faces and record attendance by simply looking at a camera. Admins can manage virtual "rooms", configure complex AM/PM schedules, and monitor real-time attendance data.

### 🔑 Key Roles

#### 👨‍🏫 Admin (Dashboard v2.0)
- **Room Management**: Create virtual rooms with specific session windows (AM/PM).
- **Security Control**: Approve students before they can join a room.
- **Master Dashboard**: Comprehensive view of students, absent tracking, and manual log corrections.
- **Analytics**: Auto-calculation of fines (₱50) and attendance events.

#### 🎓 Student (GCash-Style Flow)
- **Secure Authentication**: Sign up and log in via Name and ID.
- **Biometric Enrollment**: Premium GCash-style registration with live mesh scanning, manual shutter, and precision cropping.
- **Biometric Security**: Server-side duplication check prevents identity theft.
- **Personal Dashboard**: View individual attendance history, current status, and accumulated fines.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org) (App Router, Turbopack)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) (Premium Dark Aesthetic) + [Shadcn UI](https://ui.shadcn.com)
- **Backend/Auth**: [Supabase](https://supabase.com) (PostgreSQL, Auth, RLS)
- **AI/ML**: [Face-api.js](https://github.com/justadudewhohacks/face-api.js) (SSD Mobilenet v1)
- **Animations**: [Framer Motion 12](https://www.framer.com/motion/)

---

## 📂 Database Schema

The project uses a structured PostgreSQL schema with strict Row Level Security (RLS):

- `profiles`: Stores user data, roles, facial embeddings, and cropped profile images.
- `rooms`: Stores admin-created session containers with AM/PM windows.
- `room_participants`: Links students to specific rooms with approval status.
- `attendance`: Records every time-in/out event with associated metadata and fines.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- Supabase Project

### 2. Environment Setup
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Installation
```bash
npm install
```

### 4. Run the App
```bash
npm run dev
```

---

## 🛡 Security & Privacy
- **Encrypted Embeddings**: Facial data is stored as high-dimensional mathematical descriptors (embeddings).
- **Biometric Duplication Check**: Prevents multiple accounts from using the same facial biometric.
- **RLS Protection**: Every database query is guarded by Supabase Row Level Security.

---

*Built for speed. Structured for Agents. Optimized for the Vibe.*