import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, FolderKanban, FileText, Settings } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) return null;

    return (
        <nav className="navbar glass">
            <div className="navbar-container">
                <Link to="/dashboard" className="navbar-brand">
                    <FolderKanban size={28} />
                    <span>PM Software</span>
                </Link>

                <div className="navbar-links">
                    <Link to="/dashboard" className="nav-link">
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/projects" className="nav-link">
                        <FolderKanban size={20} />
                        <span>Projects</span>
                    </Link>
                    <Link to="/templates" className="nav-link">
                        <FileText size={20} />
                        <span>Templates</span>
                    </Link>
                </div>

                <div className="navbar-user">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                        </div>
                        <div className="user-details">
                            <div className="user-name">{user.firstName} {user.lastName}</div>
                            <div className="user-role">{user.role}</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
