import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectCreate from './pages/ProjectCreate';
import ProjectDetail from './pages/ProjectDetail';
import Templates from './pages/Templates';
import TemplateCreate from './pages/TemplateCreate';
import './index.css';

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="app">
                    <Navbar />
                    <Routes>
                        <Route path="/login" element={<Login />} />

                        <Route path="/dashboard" element={
                            <PrivateRoute>
                                <Dashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/projects/new" element={
                            <PrivateRoute>
                                <ProjectCreate />
                            </PrivateRoute>
                        } />
                        <Route path="/projects/:id" element={
                            <PrivateRoute>
                                <ProjectDetail />
                            </PrivateRoute>
                        } />
                        <Route path="/templates" element={
                            <PrivateRoute>
                                <Templates />
                            </PrivateRoute>
                        } />
                        <Route path="/templates/new" element={
                            <PrivateRoute>
                                <TemplateCreate />
                            </PrivateRoute>
                        } />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
