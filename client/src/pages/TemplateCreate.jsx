import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { templateService } from '../services/api';
// We can reuse ProjectCreate.css for basic form styles or create a new one. 
// For consistency, I'll reuse the class names but import a specific CSS if needed.
// Or effectively, I can import ProjectCreate.css if the classes are generic enough, 
// OR simpler: copy the necessary styles to a new css file or just use inline styles for the wrapper.
// Let's create a specialized CSS for it to be clean.
import './TemplateCreate.css';

const TemplateCreate = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'Software Development', // Default category
    });
    const [error, setError] = useState('');

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
            // The API expects 'createdBy' in the body, but usually the backend infers it from the token.
            // Looking at the provided Template.js model, it uses 'createdBy' from templateData.
            // However, the controller *should* inject the user ID from the request.
            // Assuming the controller handles it, or we might need to send it.
            // For now, I'll send basic data. If it fails, I'll check the controller.

            // Wait, I don't have the controller code viewable, but generally `req.user.id` is used.
            // If the model `createTemplate` receives `templateData` directly from `req.body`, that would be a security risk.
            // But let's assume the backend is reasonably well implemented. 
            // If it fails, I'll debug.

            // Update: actually the model snippet showed:
            // const { name, description, category, createdBy } = templateData;
            // The service call: api.post('/templates', templateData)
            // So we send name, description, category.

            const user = JSON.parse(localStorage.getItem('user'));
            const payload = {
                ...formData,
                createdBy: user ? user.id : null // explicitly sending it just in case, though backend should handle it
            };

            await templateService.create(payload);
            navigate('/templates');
        } catch (err) {
            console.error('Failed to create template:', err);
            setError(err.response?.data?.message || 'Failed to create template.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="template-create-container">
            <div className="template-create-header">
                <h1>Create New Template</h1>
                <p className="subtitle">Define a new project structure</p>
            </div>

            <div className="card">
                {error && (
                    <div className="badge badge-error" style={{ marginBottom: '1rem', padding: '0.5rem 1rem', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="template-create-form">
                    <div className="form-group">
                        <label htmlFor="name" className="label">Template Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            className="input"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="e.g. Mobile App Development"
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
                            placeholder="Describe what this template is for..."
                            style={{ minHeight: '100px' }}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="category" className="label">Category</label>
                        <select
                            id="category"
                            name="category"
                            className="input"
                            value={formData.category}
                            onChange={handleChange}
                        >
                            <option value="Software Development">Software Development</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Design">Design</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="alert-info">
                        <strong>Note:</strong> You can add Phases and Deliverables to this template after creating it.
                        (Feature coming soon)
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/templates')}
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
                                'Create Template'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TemplateCreate;
