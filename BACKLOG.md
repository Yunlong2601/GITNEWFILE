FortiFile Replit Backlog (Flask Migration)
Legend

 Not started

[~] In progress

 Done

0) Project Setup

 Replit project runs with one Run button

 Secrets set: SECRET_KEY, DATABASE_URL, GMAIL_USER, GMAIL_APP_PASSWORD

 PostgreSQL connected and tables auto-created

 Upload folder created automatically (/uploads)

 Seed accounts exist:

 admin / admin123

 user / user123

1) Authentication (Cookie-based Sessions)

 Login page /login works

 Logout works

 Cookie-based session persists after refresh

 Role enforcement works (admin vs user)

 Unauthorized user redirected to /login

2) Main File Manager UI (/)
Layout / UX

 Sidebar exists: My Drive / Recent / Starred / Trash

 Grid view toggle works

 List view toggle works

 Search by filename works

 Storage tracking shown (total used bytes/MB)

 Storage visualization shown (progress bar or chart)

Upload

 Drag & drop upload works (HTML5 dropzone)

 File picker upload works

 Multi-file upload works (optional, but nice)

 Security level selector works: Standard / High / Maximum

 Files display with badge showing security level

3) File Organization Logic

 My Drive shows active files

 Recent shows most recently uploaded/opened

 Starred toggle works (star/unstar)

 Trash works (delete moves to trash, restore works)

 Permanent delete works (optional)

4) DLP Scanning (Client-side for text files)
Detection Rules

 Email addresses detected

 Phone numbers detected

 Credit card detected + Luhn validation

 Physical addresses detected (simple pattern ok)

 Password patterns detected (password:/pass=/pwd=)

 Personal names detected (Mr./Mrs./Ms./Dr.)

Flow

 DLP runs before upload for text files (.txt/.csv/.json)

 Non-text files skip DLP and upload directly

 Warning dialog shows detected sensitive types

 Cancel stops upload

 Proceed uploads file

5) DLP Admin Logging (Last 100 only)

 Frontend sends log event to backend (POST /api/dlp/log)

 Backend stores last 100 entries only (ring buffer OR DB-limited)

 Admin-only API works: GET /api/dlp/logs

 Admin dashboard page /admin/dlp-logs exists

 Logs table shows:

 timestamp

 username

 file name

 file size

 sensitive data types

 action (uploaded/cancelled)

 Refresh button reloads latest logs

6) Maximum Security (End-to-End Encryption)
Crypto (Client-side)

 Uses Web Crypto API AES-GCM

 Key derivation uses PBKDF2 100,000 iterations

 Encrypted package includes: metadata + salt + IV + encrypted content

 Output file name ends with .encrypted

 Server stores only encrypted content (never plaintext)

Email Code Flow

 API endpoint works: POST /api/send-decryption-code

 Email sends via Gmail SMTP

 Email subject includes: [FortiFile] Decryption Code #FortiFile

 Email body ends with hashtag line: #FortiFile

 6-digit code format enforced (000000–999999)

7) Decrypt Page (/decrypt)

 Page exists and loads

 Upload .encrypted file works

 Input code works (6 digits)

 Decrypt happens client-side

 Decrypted file downloads with original filename/type

 Wrong code shows friendly error

8) Secure Chat Sidebar (LocalStorage)

 Chat sidebar appears on main interface

 User sets display name

 Create room works

 Join room works

 Send messages works

 Messages persist via localStorage after refresh

 Room 2FA option exists

 2FA code required to enter protected room

 2FA verification persists per session/localStorage

9) Polish / Quality

 Tailwind styling looks clean + consistent

 Mobile layout doesn’t break (basic)

 File size formatting (KB/MB) looks correct

 Dates look readable (Python formatting or JS)

 Error states handled (no silent failures)

10) Security / Safety Checks (Prototype-level)

 Admin routes blocked for non-admin

 Users can’t download others’ files

 Upload filename sanitized (no path traversal)

 Basic file size limit set (optional but recommended)

“If Replit didn’t finish these, do next”

 Implement drag & drop properly

 Implement starred/trash logic

 Add storage chart/progress bar

 Fix DLP modal + logging consistency

 Make Maximum encryption flow stable end-to-end

 Finish chat sidebar + 2FA

 LOGGING REQUIREMENTS (2 separate logs)

 1) DLP LOG (admin-only)
 - Only for sensitive-data detections during upload
 - Endpoint: GET /api/dlp/logs
 - Fields: timestamp, username, file_name, file_size, sensitive_types, action(uploaded/cancelled), security_level

 2) SECURITY AUDIT LOG (admin-only)
 - For security-relevant actions system-wide (login/logout/upload/download/delete/restore/star/email-code-sent/decrypt-fail)
 - Endpoint: GET /api/audit/logs
 - Fields: timestamp, username, event_type, target_type, target_id, metadata (JSON), ip_address(optional), user_agent(optional)
