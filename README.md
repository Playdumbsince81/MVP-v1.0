# AI Workflow Builder

A no-code platform for building modular generative AI applications using natural language. This application allows users to create multi-modal generative AI applications by linking together modular components like input capture, model selection, output rendering, and conditional logic.

## Features

- **Visual Workflow Builder**: Drag-and-drop interface for connecting AI components
- **Modular Design**: Pre-built modules for inputs, AI models, outputs, and logic
- **AI Integration**: Support for OpenAI and Anthropic models
- **Workflow Management**: Save, load, clone, and execute workflows
- **API Key Management**: Securely store and use API keys for different AI providers

## Project Structure

```
/app/
├── backend/         # FastAPI backend
│   ├── server.py    # Main FastAPI application
│   ├── .env         # Backend environment variables
│   └── requirements.txt  # Python dependencies
├── frontend/        # React frontend
│   ├── package.json # Node.js dependencies and scripts
│   ├── src/         # React source code
│   │   ├── App.js   # Main React component
│   │   ├── App.css  # Component styles
│   │   └── index.js # Entry point
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── .env         # Frontend environment variables
```

## Setup Instructions

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ai-workflow-builder.git
   cd ai-workflow-builder
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   
   # Create .env file with:
   # MONGO_URL=mongodb://localhost:27017
   # DB_NAME=workflow_builder
   
   # Start the backend server
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   yarn install
   
   # Create .env file with:
   # REACT_APP_BACKEND_URL=http://localhost:8001
   
   # Start the frontend development server
   yarn start
   ```

4. **MongoDB Setup**:
   ```bash
   # Install MongoDB if not already installed
   # On Ubuntu:
   sudo apt-get install mongodb
   
   # On macOS:
   brew install mongodb-community
   
   # Start MongoDB
   mongod --dbpath=/path/to/data/directory
   ```

### Deployment Options

#### Render Deployment

1. **Create a new Web Service** on Render for the backend:
   - Connect your GitHub repo
   - Set build command: `pip install -r backend/requirements.txt`
   - Set start command: `cd backend && uvicorn server:app --host 0.0.0.0 --port $PORT`
   - Add environment variables: `MONGO_URL` and `DB_NAME`

2. **Create a Static Site** on Render for the frontend:
   - Connect your GitHub repo
   - Set build command: `cd frontend && yarn install && yarn build`
   - Set publish directory: `frontend/build`
   - Add environment variable: `REACT_APP_BACKEND_URL` (URL of your backend service)

3. **Set up MongoDB Atlas** for your database:
   - Create a free cluster on MongoDB Atlas
   - Configure network access to allow connections from your Render services
   - Update the `MONGO_URL` in your backend service to point to your Atlas cluster

#### Replit Deployment

1. **Create a new Repl** with the Node.js template:
   - Import from GitHub or create from scratch

2. **Configure the Repl**:
   - Add `.replit` file:
     ```
     run = "cd backend && python server.py"
     ```
   
   - Add `pyproject.toml` to install Python dependencies:
     ```toml
     [tool.poetry]
     name = "ai-workflow-builder"
     version = "0.1.0"
     
     [tool.poetry.dependencies]
     python = "^3.8"
     fastapi = "0.110.1"
     uvicorn = "0.25.0"
     pymongo = "4.5.0"
     # Add other dependencies from requirements.txt
     
     [build-system]
     requires = ["poetry-core>=1.0.0"]
     build-backend = "poetry.core.masonry.api"
     ```

3. **Set up MongoDB**:
   - Use MongoDB Atlas or Replit's built-in database
   - Configure connection strings in the Replit Secrets tab

4. **Build and Run the Frontend**:
   - Add a shell script to build the frontend:
     ```bash
     cd frontend
     npm install
     npm run build
     ```
   - Configure the server to serve the frontend build files

## API Key Setup

To use AI models with this application, you'll need to add your API keys:

1. Launch the application and click on the "Settings" link in the sidebar
2. Enter your OpenAI and/or Anthropic API keys
3. Click "Save"

## Usage Guide

1. **Creating a Workflow**:
   - Click "New Workflow" in the sidebar
   - Enter a name and optional description
   - Click the "+" button to add modules
   - Drag modules to arrange them on the canvas

2. **Configuring Modules**:
   - Click on a module to open its configuration panel
   - Adjust settings like model type, temperature, etc.
   - Click "Apply" to save changes

3. **Connecting Modules**:
   - Drag from an output handle to an input handle to create connections
   - Connections determine how data flows through your workflow

4. **Saving and Executing**:
   - Click the save button to store your workflow
   - Click the play button to execute the workflow
   - View execution results in the popup dialog

## Extending the Application

This application is designed to be extendable. Here are some ways to add functionality:

1. **Adding New Module Types**:
   - Add a new module type definition in the `server.py` file
   - Implement handling for the new module type in the workflow execution logic

2. **Supporting Additional AI Providers**:
   - Add provider configuration in the admin panel
   - Implement the API client in the backend

3. **Enhancing the User Interface**:
   - Modify the React components in the `frontend/src` directory
   - Add new UI features using Tailwind CSS for styling

## License

MIT
