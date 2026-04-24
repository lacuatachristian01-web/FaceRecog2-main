# 🚀 Facial Recognition Attendance System

A high-performance attendance management system built with **Next.js 15**, **Supabase**, and **Face-api.js**. Designed for educational and corporate environments to automate attendance tracking using secure facial recognition.

## 📌 Project Overview

This system allows students to register their faces and record attendance by simply looking at a camera. Admins can manage virtual "rooms" and monitor real-time attendance data, including events and fines.

### 🔑 Key Roles

#### 👨‍🏫 Admin
- **Room Management**: Create virtual rooms and generate unique join codes.
- **Master Dashboard**: Access a comprehensive view of all students, including:
  - Student Name & ID
  - Time In / Time Out logs
  - Attended Events
  - Total Fines calculation
- **Non-Face Registered**: Admins do not require facial registration.

#### 🎓 Student
- **Secure Authentication**: Sign up and log in via email.
- **Face Registration**: Register facial biometrics after initial sign-up (mandatory for attendance).
- **Easy Joining**: Join rooms created by admins using a simple code.
- **Instant Attendance**: Use the facial recognition terminal to "Time In" or "Time Out".
- **Personal Status**: View individual attendance history and current status.

---

## 🛠 Tech Stack

- **Frontend**: [Next.js 15](https://nextjs.org) (App Router, Server Components)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com) + [Shadcn UI](https://ui.shadcn.com)
- **Backend/Auth**: [Supabase](https://supabase.com) (PostgreSQL, Auth, RLS)
- **AI/ML**: [Face-api.js](https://github.com/justadudewhohacks/face-api.js) (TensorFlow.js based)
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion

---

## 📂 Database Schema

The project uses a structured PostgreSQL schema with strict Row Level Security (RLS):

- `profiles`: Stores user data, roles, and facial embeddings.
- `rooms`: Stores admin-created session containers.
- `room_participants`: Links students to specific rooms.
- `attendance`: Records every time-in/out event with associated metadata.

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

### 4. Database Setup
Apply the migrations located in `supabase/migrations/` or execute the SQL provided in the setup file.

### 5. Run the App
```bash
npm run dev
```

---

## 🛡 Security & Privacy
- **Encrypted Embeddings**: Facial data is stored as high-dimensional mathematical descriptors (embeddings), not raw images.
- **RLS Protection**: Every database query is guarded by Supabase Row Level Security to ensure students can only see their own data and admins can only see data for their rooms.

---

*Built with passion. Secured with AI. Optimized for the Vibe.*
Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain (needed for password reset email links)
4. Deploy

> **Important:** Update Supabase → Auth → URL Configuration → add your Vercel URL to **Redirect URLs**.

---

*Built for speed. Structured for Agents. Optimized for the Vibe.*