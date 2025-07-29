import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LoginForm />;
};

export default LoginPage;