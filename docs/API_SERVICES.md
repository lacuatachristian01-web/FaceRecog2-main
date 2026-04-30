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
- `createRoom(...)`: Initializes a new session with complex AM/PM windows, event details, and a unique 6-character code.
- `joinRoom(code)`: Connects a student to a room (pending approval) and updates `last_room_id`.
- `getAdminRooms()`: Lists all rooms created by the current admin.
- `getStudentRooms()`: Lists all rooms joined by the current student.
- `approveStudent(roomId, studentId)`: Admin action to allow a student into a room.
- `removeStudentFromRoom(roomId, studentId)`: Removes a student's participation record.
- `updateRoom(roomId, updates)` / `deleteRoom(roomId)`: Standard CRUD operations.

### 📝 attendance.ts
Handles logging and reporting.
- `timeIn(roomId, studentId)`: Logs arrival, detects "Late" status based on scheduled windows, and applies fines.
- `timeOut(roomId, studentId)`: Logs departure for the active session.
- `getAdminDashboard(roomId)`: Aggregates logs, profiles, and calculates total fines for a room.
- `getAbsentStudents(roomId)`: Identifies approved students who haven't timed in for the current date.
- `updateAttendanceRecord(id, updates)` / `deleteAttendanceRecord(id)`: Allows admins to manually correct logs.

### 👤 face.ts
Facial descriptor processing and biometric security.
- `registerFace(descriptors, faceImage)`: Saves the 128-dimensional embedding and a cropped face photo. Includes a **biometric duplication check** (threshold: 0.40 distance) to prevent identity theft.
- `getFaceEmbedding(userId)`: Retrieves a user's biometric data and profile image.
- `getRoomParticipantsWithFaces(roomId)`: Fetches all registered face embeddings for students in a room for terminal matching.
