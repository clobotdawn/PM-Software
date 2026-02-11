import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/api';
import { LayoutDashboard, FolderKanban, Plus, Clock, CheckCircle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        completed: 0,
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const data = await projectService.getAll();
            setProjects(data);

            // Calculate stats
            const total = data.length;
            const active = data.filter(p => p.status === 'active').length;
            const completed = data.filter(p => p.status === 'completed').length;

            setStats({ total, active, completed });
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadgeClass = (status) => {
        const classes = {
            draft: 'badge-gray',
            active: 'badge-info',
            on_hold: 'badge-warning',
            completed: 'badge-success',
            cancelled: 'badge-error',
        };
        return classes[status] || 'badge-gray';
    };

    const getStatusDisplayName = (status) => {
        return status.replace('_', ' ');
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.firstName}!</h1>
                    <p className="subtitle">Here's an overview of your projects</p>
                </div>
                <Link to="/projects/new" className="btn btn-primary">
                    <Plus size={20} />
                    New Project
                </Link>
            </div>

            <div className="stats-grid">
                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <FolderKanban size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Projects</div>
                    </div>
                </div>

                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                        <Clock size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.active}</div>
                        <div className="stat-label">Active Projects</div>
                    </div>
                </div>

                <div className="stat-card card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <CheckCircle size={24} color="white" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.completed}</div>
                        <div className="stat-label">Completed Projects</div>
                    </div>
                </div>
            </div>

            <div className="projects-section">
                <h2>Your Projects</h2>

                {projects.length === 0 ? (
                    <div className="empty-state card">
                        <LayoutDashboard size={48} color="var(--gray-400)" />
                        <h3>No projects yet</h3>
                        <p>Create your first project to get started</p>
                        <Link to="/projects/new" className="btn btn-primary">
                            <Plus size={20} />
                            Create Project
                        </Link>
                    </div>
                ) : (
                    <div className="projects-grid">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className="project-card card"
                            >
                                <div className="project-card-header">
                                    <h3>{project.name}</h3>
                                    <span className={`badge ${getStatusBadgeClass(project.status)}`}>
                                        {getStatusDisplayName(project.status)}
                                    </span>
                                </div>

                                {project.description && (
                                    <p className="project-description">{project.description}</p>
                                )}

                                <div className="project-meta">
                                    <div className="project-meta-item">
                                        <span className="meta-label">Template:</span>
                                        <span className="meta-value">{project.template_name || 'N/A'}</span>
                                    </div>
                                    <div className="project-meta-item">
                                        <span className="meta-label">PM:</span>
                                        <span className="meta-value">{project.pm_name}</span>
                                    </div>
                                </div>

                                {project.start_date && (
                                    <div className="project-dates">
                                        <Clock size={14} />
                                        <span>
                                            {new Date(project.start_date).toLocaleDateString()} -
                                            {new Date(project.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
