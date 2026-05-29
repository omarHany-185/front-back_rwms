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
├── requirements.txt    # System prerequisites
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

See `requirements.txt` for full details. You need:

- **Java JDK** 17+
- **Maven** 3.8+ (or use bundled `mvnw.cmd`)
- **MySQL** 8.0+
- **Node.js** 18+
- **npm** 9+

## How to Run

### Step 1: Database

Start MySQL and create the database:

```sql
CREATE DATABASE rwms_db;
```

Default connection: `root/root` on `localhost:3306`.  
To change credentials, edit:  
`Remote-Work-Management-System/src/main/resources/application.properties`

### Step 2: Start the Backend

Open a terminal (PowerShell or CMD) and run:

```powershell
cd Remote-Work-Management-System
.\mvnw.cmd spring-boot:run
```

- First run downloads Maven dependencies (may take a few minutes).
- Backend starts at **http://localhost:8080**.
- Hibernate `ddl-auto=update` creates database tables automatically.
- **Keep this terminal open** while using the app.

### Step 3: Start the Frontend

Open a **second terminal** and run:

```powershell
cd rwms-frontend
npm install
npm run dev
```

- `npm install` only needed the first time (or when dependencies change).
- Frontend dev server starts at **http://localhost:3000**.
- API calls are proxied to the backend automatically.

### Step 4: Open the App

Go to **http://localhost:3000** in your browser.

## Default Login Credentials

| Email               | Password | Role         |
|---------------------|----------|--------------|
| manager@rwms.local  | (any)    | Manager      |
| omar@company.com    | (any)    | Team Leader  |
| omar@company1.com   | (any)    | Employee     |

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

### Projects
| Method | Path                                      | Description                |
|--------|-------------------------------------------|----------------------------|
| GET    | /projects/all                             | All projects (Manager)     |
| GET    | /projects/department/{dept}               | Projects by department     |
| GET    | /projects/my                              | My projects                |
| GET    | /projects/{id}                            | Project details            |
| POST   | /projects                                 | Create project             |
| POST   | /projects/{id}/contributors               | Add contributors           |
| DELETE | /projects/{id}/contributors/{userId}      | Remove contributor         |
| POST   | /projects/{id}/request-tl                 | Request team leader        |

### Users
| Method | Path                    | Description                |
|--------|-------------------------|----------------------------|
| GET    | /users/pending          | Pending approvals (Mgr)    |
| POST   | /users/{id}/approve     | Approve user               |
| POST   | /users/{id}/reject      | Reject user                |

## Workflow Overview

1. **Manager** approves user registrations and project requests
2. **Team Leader** creates projects, assigns employees, creates tasks with subtasks
3. **Employee** opens assigned task, starts timer, completes subtasks, submits work with attachment
4. **Team Leader** reviews submissions (approve/reject with notes)
5. **Manager** oversees the entire organization

## License

MIT
