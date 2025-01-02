# Project Setup and Deployment Guide

This guide provides detailed steps to clone, install, and run the project, including Docker container setup.

## Prerequisites

Before proceeding, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/) (latest version)
- [Git](https://git-scm.com/)

## 1. Cloning the Repository

1. Open your terminal.
2. Navigate to the directory where you want to clone the project.
3. Run the following command:
   ```bash
   git clone https://github.com/your-username/your-repository.git
   ```
4. Navigate to the project directory:
   ```bash
   cd your-repository
   ```

## 2. Setting Up the Environment Variables

1. Create a `.env` file in the root directory of the project.
2. Add the following variables to the `.env` file (replace placeholders with actual values):

### `.env.server`
```
# ImageKit API keys
IMAGE_KIT_ENDPOINT=https://ik.imagekit.io/ula6wme9r
IMAGE_KIT_PUBLIC_KEY=public_FsV5vybnkOY0YhDMsT/8MTXGfDk=
IMAGE_KIT_PRIVATE_KEY=private_1Sxplsxl+jLklEdO6ZrBDiYDsfU=

# Client URL
CLIENT_URL=http://localhost:5173

# MongoDB
MONGO=mongodb+srv://adim806:adim806@cluster0.l3boy.mongodb.net/aichat?retryWrites=true&w=majority&appName=Cluster0

# Clerk API keys
CLERK_PUBLISHABLE_KEY=pk_test_ZnVua3ktZ29iYmxlci0zMS5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_Jdg1ofwlGhOCiOjYsGKNBarOBUXlP3aPD9zSCJe24T
```

### `.env.client`
```
# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_ZnVua3ktZ29iYmxlci0zMS5jbGVyay5hY2NvdW50cy5kZXYk

# ImageKit
VITE_IMAGE_KIT_ENDPOINT=https://ik.imagekit.io/ula6wme9r
VITE_IMAGE_KIT_PUBLIC_KEY=public_FsV5vybnkOY0YhDMsT/8MTXGfDk=

# Gemini API
VITE_GEMINI_PUBLIC_KEY=AIzaSyCDxzwWuQEk-0-YforMIVDp33J-mZaGV9g

# Base API
VITE_API_URL=http://localhost:3000

# Google Places
VITE_GOOGLE_PLACE_API_KEY=***REMOVED***

# Mapbox
VITE_MAPBOX_TOKEN=pk.eyJ1IjoiYWRpbTgwNiIsImEiOiJjbTNrMndrdXowN2IxMnFxejk2eWd3ZHk1In0.CQ3v2jo0DCBsgNgt3raS1g

# OpenWeather
VITE_OPENWEATHER_API_KEY=e240b46cf715142953c2d07d2476fa06

# Foursquare
VITE_FOUR_SQUARE_API_KEY=fsq3k6aPMxVzonJJhdAClLku7ueAzXBZkRUKkkGdvNozHO8=
```

## 3. Installing Dependencies

Run the following command to install all required dependencies:
```bash
npm install
```
or, if you are using Yarn:
```bash
yarn install
```

## 4. Running the Development Server

To start the development server, run:
```bash
npm run dev
```
or, if you are using Yarn:
```bash
yarn dev
```
The application will be available at `http://localhost:5173/`.

## 5. Docker Setup

### 5.1. Building the Docker Image

1. Make sure Docker is running on your machine.
2. Build the Docker image by running:
   ```bash
   docker build -t your-repository-name .
   ```

### 5.2. Running the Docker Container

1. Run the container with the following command:
   ```bash
   docker run -p 5173:5173 --env-file .env --name your-container-name your-repository-name
   ```
   - `-p 5173:5173`: Maps port 5173 on your machine to port 5173 in the container.
   - `--env-file .env`: Loads the environment variables from the `.env` file.

2. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

### 5.3. Managing the Docker Container

- **Stop the container**:
  ```bash
  docker stop your-container-name
  ```
- **Start the container**:
  ```bash
  docker start your-container-name
  ```
- **Remove the container**:
  ```bash
  docker rm your-container-name
  ```

## 6. Testing

To run tests (if available), use the following command:
```bash
npm test
```
or
```bash
yarn test
```

## 7. Deployment

For production, you can use the following steps:

1. Build the application:
   ```bash
   npm run build
   ```
   or
   ```bash
   yarn build
   ```
2. Serve the production build:
   ```bash
   npm run serve
   ```

## Notes

- Ensure all required API keys are set in the `.env` file before running the application.
- Update your API keys regularly and keep them secure.
- For issues or questions, contact the project maintainer at [your-email@example.com](mailto:your-email@example.com).

Enjoy using the project!

