# RWMS - Remote Work Management System

A full-stack web application for managing remote work, task tracking, submissions, and approvals. Built with **Vue 3 (frontend)** and **Spring Boot (backend)** with **MySQL**.

## Features

### Employee
- **Timer tracking** – Start, pause, resume, and stop work sessions with real-time duration display
- **Task management** – View assigned tasks, mark subtasks complete, submit work
- **File attachments** – Upload files with submissions, download reviewed attachments
- **Submission history** – Track past submissions, review status, and team leader feedback
- **Auto session termination** – Sessions automatically end after 8 hours

### Team Leader
- **Project management** – Create project requests, assign employees
- **Task creation** – Create tasks with subtasks and assign to team members
- **Submission review** – Review employee submissions (approve/reject with notes)
- **Team dashboard** – View team members' work status (Working / On Break / Online) and time tracked

### Manager
- **User approval** – Approve or reject new user registrations
- **Project request approval** – Review and approve team leader project requests
- **Administration** – View all users, manage departments

## Tech Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Frontend | Vue 3 (Options API), Webpack 5, CSS           |
| Backend  | Spring Boot 3, Spring Security, JPA/Hibernate |
| Database | MySQL 8                                       |
| Auth     | JWT (JSON Web Tokens)                         |

## Project Structure

```
rwms-frontend/
├── src/
│   ├── controllers/    # Business logic (RwmsController)
│   ├── css/            # Styles
│   ├── js/             # API layer (axios)
│   ├── models/         # Reactive state model
│   ├── services/       # Service layer (task, submission, user, approval)
│   └── views/          # Vue components (App, Login, Dashboard)
├── index.html
├── webpack.config.js
├── package.json
└── Remote-Work-Management-System/   # Spring Boot backend
    └── src/main/java/com/rwms/
        ├── auth/          # JWT authentication
        ├── task/          # Task & subtask management
        ├── timer/         # Work session timer
        ├── submission/    # Submission & review
        ├── approval/      # Project & user approval
        └── user/          # User management
```

## Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+ (JDK)
- **MySQL** 8.0+
- **Maven** 3.8+ (or use the bundled `mvnw.cmd`)

## Setup

### 1. Database

Create the MySQL database:

```sql
CREATE DATABASE rwms_db;
```

Backend connects with `root/root` on `localhost:3306` by default (configurable in `application.properties`).

### 2. Backend

```bash
cd Remote-Work-Management-System
.\mvnw.cmd spring-boot:run
```

The backend starts on `http://localhost:8080`. Hibernate `ddl-auto=update` creates tables automatically.

### 3. Frontend

```bash
npm install
npm run dev       # Development server on port 3000 (proxied to backend)
# OR
npm run build     # Production build to dist/
```

## API Endpoints

### Auth
| Method | Path             | Description      |
|--------|------------------|------------------|
| POST   | /auth/login      | Login            |
| POST   | /auth/signup     | Register         |

### Timer
| Method | Path                | Description              |
|--------|---------------------|--------------------------|
| POST   | /timer/start/{taskId}| Start work session      |
| POST   | /timer/pause        | Pause (break) session    |
| POST   | /timer/resume       | Resume from break        |
| POST   | /timer/sync         | Sync timer tick          |
| POST   | /timer/end          | End session              |
| GET    | /timer/active       | Get active session       |
| GET    | /timer/team         | Team work status         |

### Tasks
| Method | Path                            | Description              |
|--------|---------------------------------|--------------------------|
| GET    | /tasks/my                       | My assigned tasks        |
| POST   | /tasks/{id}/start               | Start task               |
| POST   | /tasks/{id}/subtasks/{sid}/complete | Complete subtask     |

### Submissions
| Method | Path                    | Description                |
|--------|-------------------------|----------------------------|
| POST   | /submissions            | Submit task with attachment|
| GET    | /submissions/my         | My submissions             |
| GET    | /submissions/pending    | Pending reviews (TL)       |
| GET    | /submissions/{id}       | Submission detail          |
| GET    | /submissions/{id}/file  | Download attachment file   |
| POST   | /submissions/{id}/review| Review submission          |
| POST   | /submissions/{id}/comments | Add comment             |

### Users
| Method | Path                    | Description                |
|--------|-------------------------|----------------------------|
| GET    | /users/pending          | Pending approvals (Mgr)    |
| POST   | /users/{id}/approve     | Approve user               |
| POST   | /users/{id}/reject      | Reject user                |

## Login Credentials (dev defaults)

| Email               | Role         |
|---------------------|--------------|
| manager@rwms.local  | Manager      |
| omar@company.com    | Team Leader  |
| omar@company1.com   | Employee     |

## License

MIT
