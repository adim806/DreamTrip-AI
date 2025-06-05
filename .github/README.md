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

- Manually triggered workflow with component selection (client/server/both)
- Validates code and generates development reports
- Helpful for sprint reviews and code quality checks

### 5. Deployment Workflow (Currently Disabled)

- The deployment workflow has been commented out as we're still in the development phase
- Will be enabled once we're ready for staging/production deployments

## Development Phase Setup

During development, the workflows are focused on ensuring code quality through:

- Linting to maintain code style and catch syntax errors
- Running tests with MongoDB integration for the backend
- Ensuring builds complete successfully

## Future Deployment Setup

For future reference, the following secrets will need to be set in your GitHub repository once we reach the deployment phase:

### Vercel Deployment

- `VERCEL_TOKEN`: Your Vercel access token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID_FRONTEND`: The project ID for your frontend application

### Render Deployment

- `RENDER_API_KEY`: Your Render API key
- `RENDER_SERVICE_ID_BACKEND`: The service ID for your backend application

## Best Practices

1. Keep workflows modular and focused on specific tasks
2. Use matrix builds for parallel execution where possible
3. Cache dependencies to speed up builds
4. Set appropriate timeout limits for jobs
5. Use consistent naming conventions for jobs and workflows
6. Document any custom environment variables needed for tests or builds

## Using the Local Development Helper

The Local Development Helper workflow can be triggered manually from the GitHub Actions tab and offers several benefits during development:

1. **Component-specific validation**: Select which part of your application to validate (client, server, or both)
2. **Quick feedback**: Get linting, testing, and build validation without running the full CI pipeline
3. **Development reports**: Automatically generates a repository structure report that's uploaded as an artifact
4. **Sprint reviews**: Use this workflow before sprint reviews to ensure code quality

To run the workflow:

1. Go to the "Actions" tab in your GitHub repository
2. Select "Local Development Helper" from the workflows list
3. Click "Run workflow"
4. Choose the component you want to validate (client/server/both)
5. Review results and download the development report if needed
