# DreamTrip-AI

**DreamTrip-AI** is an intelligent travel agency web application that helps users plan personalized trips using AI-powered recommendations.  
This project demonstrates a full-stack setup with secure user authentication, AI integration, and modular development workflows.
<img width="400" height="350" alt="IMG_2500" src="https://github.com/user-attachments/assets/bc850157-e945-4e10-9c15-194f1da07737" />

---

## 🚀 Overview

DreamTrip-AI allows users to:

- Search and receive AI-based travel recommendations
- Save and manage trip history
- Use personalized features through **Clerk authentication**
- Interact with the application via a modern, responsive UI

The project is built with scalability and maintainability in mind, using modern frontend and backend technologies.

---

## 🛠️ Tech Stack

- **Frontend:** React / Next.js  
- **Backend:** Node.js + Express  
- **Authentication:** [Clerk](https://clerk.com)  
- **Database:** MongoDB  
- **AI Integration:** Gemini API  
- **Styling:** Tailwind CSS / Material UI  
- **Containerization & CI/CD:** Docker, GitHub Actions, Vercel/Render (future deployment)  

---

## ✨ Key Features

- ✅ Personalized travel recommendations powered by AI  
- ✅ User authentication and session management with Clerk  
- ✅ Persistent trip history in MongoDB  
- ✅ Full-stack modular architecture (client & backend separation)  
- ✅ CI/CD pipelines with automated linting, testing, and build validation  

---

## 📂 Project Structure
client/ # Frontend React/Next.js code
backend/ # Node.js + Express backend
workflows/ # GitHub Actions workflows
docker/ # Docker configuration files
package.json # Dependencies and scripts
README.md # Project documentation

---------------
# GitHub Actions Workflows for DreamTrip-AI

This directory contains the GitHub Actions workflows for the DreamTrip-AI monorepo project during the development phase.

## Current Development Phase Workflow Structure

### 1. CI Workflow (`workflows/ci.yml`)

- Triggers on every push to any branch
- Runs linting, testing, and building for both frontend and backend
- Backend tests use MongoDB service container

### 2. PR Checks Workflow (`workflows/pr-checks.yml`)

- Triggers on pull requests to the `main` branch
- Ensures code quality before merging to main
- Required checks that must pass before merging

### 3. MongoDB Service Workflow (`workflows/mongodb-service.yml`)

- Reusable workflow for setting up MongoDB service
- Can be called by other workflows

### 4. Local Development Helper (`workflows/local-development.yml`)

- Manually triggered workflow with component selection (client/backend/both)
- Validates code and generates development reports
- Helpful for sprint reviews and code quality checks
  -dam bro

### 5. Deployment Workflow (Currently Disabled)

- The deployment workflow has been commented out as we're still in the development phase
- Will be enabled once we're ready for staging/production deployments

## Development Phase Setup

During development, the workflows are focused on ensuring code quality through:

- Linting to maintain code style and catch syntax errors
- Running tests with MongoDB integration for the backend
- Ensuring builds complete successfully

## Using the Local Development Helper

The Local Development Helper workflow can be triggered manually from the GitHub Actions tab and offers several benefits during development:

1. **Component-specific validation**: Select which part of your application to validate (client, backend, or both)
2. **Quick feedback**: Get linting, testing, and build validation without running the full CI pipeline
3. **Development reports**: Automatically generates a repository structure report that's uploaded as an artifact
4. **Sprint reviews**: Use this workflow before sprint reviews to ensure code quality

To run the workflow:

1. Go to the "Actions" tab in your GitHub repository
2. Select "Local Development Helper" from the workflows list
3. Click "Run workflow"
4. Choose the component you want to validate (client/backend/both)
5. Review results and download the development report if needed
