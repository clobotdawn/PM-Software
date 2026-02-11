import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { templateService } from '../services/api'; // Using the existing service
import { Plus, LayoutTemplate, Layers } from 'lucide-react';
import './Templates.css';

const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const data = await templateService.getAll();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="templates-container">
            <div className="templates-header">
                <div>
                    <h1>Templates</h1>
                    <p className="subtitle">Manage project templates and workflows</p>
                </div>
                <Link to="/templates/new" className="btn btn-primary">
                    <Plus size={20} />
                    Create New Template
                </Link>
            </div>

            {templates.length === 0 ? (
                <div className="empty-state card">
                    <LayoutTemplate size={48} color="var(--gray-400)" />
                    <h3>No templates yet</h3>
                    <p>Create your first template to standardize your projects</p>
                    <Link to="/templates/new" className="btn btn-primary">
                        <Plus size={20} />
                        Create Template
                    </Link>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map((template) => (
                        <div key={template.id} className="template-card card">
                            <div className="template-card-header">
                                <h3>{template.name}</h3>
                                <span className="badge badge-info">{template.category || 'General'}</span>
                            </div>
                            <p className="template-description">{template.description}</p>
                            <div className="template-meta">
                                <span>Created by {template.creator_name || 'Admin'}</span>
                                {/* Assuming phase_count might be available from the API in future */}
                                {template.phase_count !== undefined && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Layers size={14} />
                                        {template.phase_count} Phases
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Templates;
