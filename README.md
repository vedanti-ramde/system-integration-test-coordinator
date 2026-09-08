# System Integration Test (SIT) Coordinator

A web-based dashboard for managing and monitoring System Integration Testing (SIT) activities across multiple services.

The application helps teams map service integrations, record API handshake test results, simulate API handshakes, and track integration defects from a centralized dashboard.

## Features

### 1. Dashboard
- Displays overall SIT statistics
- Total services and integrations
- Total handshake tests
- Passed and failed tests
- SIT pass rate
- Open and critical defects
- Integration health overview
- Recent test and defect information

### 2. Services Registry
- View registered services
- Add new services
- Edit existing services
- Delete services
- Track service status and ownership

### 3. Integration Management
- Create and manage service-to-service integrations
- View integration details
- Track integration health
- Visualize the integration topology

### 4. Handshake Test Logs
- Record API handshake test results
- Track PASS, FAIL, BLOCKED and NOT RUN results
- View test history
- Filter and search test records

### 5. API Handshake Simulator
- Simulate API handshake requests
- Test different response scenarios
- Display simulated response details
- No external API calls are required

### 6. Defect Tracker
- Create and manage integration defects
- Track defect severity
- Track defect status
- Assign defects to team members
- Search and filter defects

### 7. REST APIs
The application provides REST API endpoints for managing:
- Services
- Integrations
- Handshake tests
- Defects
- Dashboard statistics

Health check endpoint:

`GET /api/health`

Dashboard endpoint:

`GET /api/dashboard`

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript
- Bootstrap
- Chart.js

### Backend
- Node.js
- Express.js

### Data Storage
- JSON files

### Development & Testing
- Git
- GitHub
- Node.js testing utilities

## Project Structure

```text
SEQA SIT/
│
├── data/
│   ├── defects.json
│   ├── integrations.json
│   ├── services.json
│   └── tests.json
│
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── app.js
│   │   ├── dashboard.js
│   │   ├── defects.js
│   │   ├── integrations.js
│   │   ├── services.js
│   │   └── tests.js
│   ├── defects.html
│   ├── index.html
│   ├── integrations.html
│   ├── services.html
│   └── tests.html
│
├── routes/
│   ├── dashboard.js
│   ├── defects.js
│   ├── integrations.js
│   ├── services.js
│   ├── simulator.js
│   └── tests.js
│
├── utils/
│   └── dataStore.js
│
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── test_suite.js
└── README.md
