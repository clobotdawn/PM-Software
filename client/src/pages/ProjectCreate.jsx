import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { projectService, templateService } from '../services/api';
import './ProjectCreate.css';

const ProjectCreate = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        template_id: '',
        start_date: '',
        end_date: '',
        pm_name: '', // In a real app, this might be auto-filled or a user select
        client_name: '',
        client_email: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const data = await templateService.getAll();
            setTemplates(data);
            if (data.length > 0) {
                setFormData(prev => ({ ...prev, template_id: data[0].id }));
            }
        } catch (err) {
            console.error('Failed to fetch templates:', err);
            setError('Failed to load templates. Please try again.');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Construct payload with only necessary fields
            const projectData = {
                name: formData.name,
                description: formData.description,
                templateId: Number(formData.template_id),
                pmId: user.id,
                startDate: formData.start_date,
                endDate: formData.end_date
            };

            const newProject = await projectService.create(projectData);
            navigate(`/projects/${newProject.id}`);
        } catch (err) {
            console.error('Failed to create project:', err);
            setError(err.response?.data?.message || 'Failed to create project. Please check your input.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="project-create-container">
            <div className="project-create-header">
                <h1>Create New Project</h1>
                <p className="subtitle">Start a new project from a template</p>
            </div>

            <div className="card">
                {error && (
                    <div className="badge badge-error" style={{ marginBottom: '1rem', padding: '0.5rem 1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="project-create-form">
                    <div className="form-group">
                        <label htmlFor="name" className="label">Project Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Website Redesign"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description" className="label">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            className="input"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Brief description of the project..."
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="template_id" className="label">Template *</label>
                            <select
                                id="template_id"
                                name="template_id"
                                className="input"
                                value={formData.template_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a template</option>
                                {templates.map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                            </select>
                            <div style={{ marginTop: '0.25rem', textAlign: 'right' }}>
                                <Link to="/templates" style={{ fontSize: '0.85rem', color: 'var(--primary-600)', textDecoration: 'none' }}>
                                    Manage Templates &rarr;
                                </Link>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="pm_name" className="label">Project Manager</label>
                            <input
                                type="text"
                                id="pm_name"
                                name="pm_name"
                                className="input"
                                value={formData.pm_name}
                                onChange={handleChange}
                                placeholder="Name of PM"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="start_date" className="label">Start Date *</label>
                            <input
                                type="date"
                                id="start_date"
                                name="start_date"
                                className="input"
                                value={formData.start_date}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="end_date" className="label">Target End Date</label>
                            <input
                                type="date"
                                id="end_date"
                                name="end_date"
                                className="input"
                                value={formData.end_date}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="client_name" className="label">Client Name</label>
                            <input
                                type="text"
                                id="client_name"
                                name="client_name"
                                className="input"
                                value={formData.client_name}
                                onChange={handleChange}
                                placeholder="Client Company or Contact"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="client_email" className="label">Client Email</label>
                            <input
                                type="email"
                                id="client_email"
                                name="client_email"
                                className="input"
                                value={formData.client_email}
                                onChange={handleChange}
                                placeholder="client@example.com"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/dashboard')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                    Creating...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectCreate;
