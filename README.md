# Project Management Software

A comprehensive project management platform that automates the entire project lifecycle from contract to closure, with template-based deliverable creation and AI-powered automation.

## Features

- **Project Lifecycle Management**: Automated workflow from contract to closure
- **Template System**: Pre-defined project templates with phases and deliverables
- **AI-Powered Deliverable Generation**: Automatic creation of standardized documents using Google Gemini AI
- **Phase Management**: Track project phases with stakeholder assignments
- **Workflow Automation**: Automatic status transitions and notifications
- **Role-Based Access Control**: Admin, PM, Team Member, and Client roles
- **Real-time Notifications**: Email and in-app notifications for important events

## Tech Stack

### Backend
- **Node.js** + **Express.js** - RESTful API server
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **Google Gemini API** - AI-powered content generation
- **Nodemailer** - Email notifications

### Frontend
- **React** 18 - UI library
- **Vite** - Build tool
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Google Gemini API key

### Installation

1. **Clone the repository**

2. **Set up the database**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pm_software;

# Exit psql
\q

# Run the schema
psql -U postgres -d pm_software -f server/database/schema.sql
```

3. **Configure the backend**

```bash
cd server
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your configuration:
# - Database credentials
# - JWT secret
# - Gemini API key
# - Email settings (optional)
```

4. **Configure the frontend**

```bash
cd ../client
npm install

# Create .env file if needed
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

### Running the Application

1. **Start the backend server**

```bash
cd server
npm run dev
```

The server will start on `http://localhost:5000`

2. **Start the frontend development server**

```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173`

3. **Access the application**

Open your browser and navigate to `http://localhost:5173`

### Default Admin Account

After setting up the database, you'll need to create an admin user. You can do this by registering through the UI and then manually updating the role in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Project Structure

```
pm-software/
├── server/                 # Backend application
│   ├── config/            # Configuration files
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── database/          # Database schema and migrations
│   └── index.js           # Server entry point
│
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context providers
│   │   ├── services/     # API service layer
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # React entry point
│   ├── index.html
│   └── vite.config.js
│
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `PUT /api/projects/:id/status` - Update project status
- `GET /api/projects/:id/activity` - Get project activity log
- `DELETE /api/projects/:id` - Delete project

### Templates
- `GET /api/templates` - Get all templates
- `GET /api/templates/:id` - Get template by ID
- `POST /api/templates` - Create new template (Admin only)

### Deliverables
- `GET /api/deliverables/project/:projectId` - Get project deliverables
- `GET /api/deliverables/user/:userId` - Get user's deliverables
- `GET /api/deliverables/:id` - Get deliverable by ID
- `POST /api/deliverables` - Create new deliverable
- `PUT /api/deliverables/:id` - Update deliverable
- `POST /api/deliverables/:id/generate` - Generate deliverable with AI
- `DELETE /api/deliverables/:id` - Delete deliverable

## Key Features Explained

### AI-Powered Deliverable Generation

The system uses Google Gemini AI to automatically generate standardized deliverables. When a deliverable is marked as "AI-generatable" in the template:

1. The system extracts context from the project data
2. Builds a structured prompt with the template content
3. Sends the request to Gemini API
4. Stores the generated content with version control

### Workflow Automation

The workflow engine automatically:
- Transitions project phases when deliverables are completed
- Sends notifications to stakeholders
- Tracks deadlines and sends reminders
- Logs all activities for audit trail

### Template-Based Project Initialization

When creating a project:
1. Select a template with predefined phases
2. System automatically creates all phases and deliverables
3. Assign stakeholders to each phase
4. Set timelines for each phase
5. Add client contact information

## Development

### Running Tests

```bash
cd server
npm test
```

### Building for Production

```bash
# Build frontend
cd client
npm run build

# The build output will be in client/dist
```

## Environment Variables

### Server (.env)

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=pm_software
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

GEMINI_API_KEY=your_gemini_api_key

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_app_password

CLIENT_URL=http://localhost:5173
```

### Client (.env)

```env
VITE_API_URL=http://localhost:5000/api
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
