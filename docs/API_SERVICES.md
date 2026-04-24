# API & Services Documentation

## 📂 Logic Layer (src/services/)
All business logic is encapsulated in the `src/services/` directory using Server Actions or Client Services.

### 🔐 auth.ts
Handles the Name/ID based authentication flow.
- `signUpWithID(name, id, role, courseYear)`: Creates a new user with generated internal credentials.
- `signInWithID(name, id)`: Logs in a user using their ID.
- `signOut()`: Clears the session.

### 🏠 room.ts
Manages attendance sessions (Rooms).
- `createRoom(name, startTime, endTime)`: Initializes a new session with a unique code.
- `joinRoom(code)`: Connects a student to a room.
- `getAdminRooms()`: Lists all rooms created by the current admin.

### 📝 attendance.ts
Handles logging and reporting.
- `timeIn(roomId, studentId)`: Logs arrival, detects "Late" status, and applies fines.
- `timeOut(roomId, studentId)`: Logs departure.
- `getAdminDashboard(roomId)`: Aggregates logs and calculates total fines for a room.

### 👤 face.ts
Facial descriptor processing.
- `registerFace(descriptors)`: Saves the 128-dimensional embedding to the user's profile.
- `getAllStudentDescriptors(roomId)`: Fetches all registered faces for students in a specific room for terminal matching.
