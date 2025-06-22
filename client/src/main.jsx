import React from "react";
import ReactDOM from "react-dom/client";
import { Canvas } from "@react-three/fiber";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import HomePage2 from "./routes/homepage2/Homepage2";
import DashboardPage from "./routes/dashboardPage/DashboardPage";
import ChatPage from "./routes/chatPage/ChatPage";
import SigninPage from "./routes/signinPage/SigninPage";
import SignUpPage from "./routes/signUpPage/SignUpPage";
import MyTripsPage from "./routes/myTrips/MyTripsPage";
import AboutPage from "./routes/aboutPage/AboutPage";
import RootLayout from "./layouts/rootLayout/RootLayout";
import DashboardLayout from "./layouts/dashboardLayout/DashboardLayout";
import "./index.css";
import ViewTripData from "./routes/createTrip/ViewTripData";

/**
 * Error Boundary component to catch any React errors in the component tree
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main entry point for the React application using Vite and React Router DOM.
 *
 * This code sets up routing for the web application, which includes the following routes and layouts:
 *
 * - **RootLayout**: The main layout component, wrapping around child components, including home, sign-in, and sign-up pages.
 * - **HomePage**: Displayed when navigating to the root ("/") of the application.
 * - **SigninPage**: Displayed when navigating to the "/sign-in" route for user authentication.
 * - **SignUpPage**: Displayed when navigating to the "/sign-up" route for user registration.
 * - **DashboardLayout**: This layout is used for pages under the "/dashboard" path. Contains:
 *    - **DashboardPage**: Displayed when navigating to "/dashboard", acting as the main page of the user's dashboard.
 *    - **ChatPage**: Displayed when navigating to a specific chat at "/dashboard/chats/:id", where `id` is a dynamic route parameter.
 *
 * The app uses `createBrowserRouter` to handle navigation between these pages and layouts.
 *
 * The rendering of the entire application is done by targeting the root element in the HTML file.
 *
 * - **ReactDOM.createRoot**: This function mounts the React app to the HTML element with the ID `root`.
 * - **RouterProvider**: This component wraps the routing system, passing the `router` object to manage route changes and page navigation.
 *
 * Key Technologies:
 * - **React**: JavaScript library for building the UI.
 * - **React Router DOM**: Handles client-side navigation without refreshing the page.
 * - **Vite**: Fast build tool for modern web projects, used for development.
 */

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: (
          <>
            <Canvas shadows>
              <HomePage2 />
            </Canvas>
          </>
        ),
      },
      {
        path: "/sign-in/*",
        element: <SigninPage />,
      },
      {
        path: "/sign-up/*",
        element: <SignUpPage />,
      },
      {
        element: <DashboardLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },
          {
            path: "/dashboard/chats/:id",
            element: (
              <div>
                <ViewTripData /> {/* מציגים את המפה לצד הצ'אט */}
              </div>
            ),
          },
          {
            path: "/mytrips",
            element: <MyTripsPage />,
          },
          {
            path: "/about",
            element: <AboutPage />,
          },
        ],
      },
    ],
  },
]);

// StrictMode is disabled to prevent warnings with react-beautiful-dnd
// react-beautiful-dnd is not fully compatible with React 18's StrictMode
// This avoids the "defaultProps will be removed from memo components" warning
ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <RouterProvider router={router} />
  </ErrorBoundary>
);
