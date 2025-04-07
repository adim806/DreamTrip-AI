import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import './dashboardLayout.css';
import { SidebarNavigation } from "@/components/ui/sidebar";
import { TripProvider } from '@/components/tripcontext/TripProvider';

/**
 * DashboardLayout component that provides a layout for authenticated sections within the application.
 * 
 * This component:
 * 1. Manages authentication checks to restrict access to child routes if the user is not signed in.
 * 2. Utilizes Clerk's `useAuth` hook to obtain the `userId` and `isLoaded` properties.
 * 3. Redirects unauthenticated users to the sign-in page using `useNavigate`.
 * 
 * ### Key Functionalities:
 * - **Authentication Check**: Monitors the `isLoaded` and `userId` values. If the user is not authenticated (`!userId`), redirects to the `/sign-in` route.
 * - **Outlet Rendering**: Displays child components routed within `/dashboard`, utilizing `Outlet` to dynamically render these pages.
 * - **SidebarNavigation Component**: Renders a modern, collapsible sidebar for navigation between different app features.
 * 
 * ### CSS Styling:
 * - Uses `dashboardLayout.css` to style the layout of the dashboard and its sections.
 * 
 * <DashboardLayout />
 */


const DashboardLayout = () => {

  // Destructure `userId` and `isLoaded` from Clerk's useAuth hook to manage authentication state
  const {userId, isLoaded}= useAuth();
  const navigate = useNavigate();

  // Redirects to the sign-in page if the user is not authenticated
  useEffect(() => {
    if(isLoaded && !userId) {
      navigate("/sign-in");
    }

  },[isLoaded, userId, navigate]);

  // Displays a loading message until the auth state is fully loaded
  if(!isLoaded) return "loading...";

  return (
    <TripProvider>
    <div className="DashboardLayout">
      {/* Modern collapsible sidebar for navigation */}
      <SidebarNavigation />

      {/* Main content area rendering nested routes via Outlet */}
      <div className="content"><Outlet/></div>
    </div>
    </TripProvider>
  );
};

export default DashboardLayout;