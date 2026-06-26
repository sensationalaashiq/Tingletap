// src/components/AuthRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const AuthRoute = ({ user, children }) => {
  // Anonymous users used only for username-lookup (no isGuest flag yet) should NOT redirect.
  // Real guest users always have 'isGuest' = 'true' in localStorage before reaching here.
  if (user && (!user.isAnonymous || localStorage.getItem('isGuest') === 'true')) {
    return <Navigate to="/welcome" replace />;
  }
  return children;
};

export default AuthRoute;
