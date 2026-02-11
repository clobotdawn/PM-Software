import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ChevronDown, ChevronRight, Calendar, CheckCircle, Clock, Pencil, MoreHorizontal, Plus, GripVertical } from 'lucide-react';
import './ProjectDetail.css';

const ProjectDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedPhases, setExpandedPhases] = useState({});

    // For Gantt Calculation - Fixed 1 Year View
    const currentYear = new Date().getFullYear();
    const timelineStart = new Date(currentYear, 0, 1); // Jan 1st
    const timelineEnd = new Date(currentYear, 11, 31); // Dec 31st
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

    // Grid Data (Fixed 12 Months)
    const gridMonths = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(currentYear, i, 1);
        return {
            label: date.toLocaleDateString('default', { month: 'short' }),
            key: i
        };
    });

    useEffect(() => {
        fetchProjectDetails();
    }, [id]);

    const fetchProjectDetails = async () => {
        try {
            let data = await projectService.getById(id);

            // --- DUMMY DATA INJECTION ---
            const hasRealData = data.phases && data.phases.length > 0 && data.phases[0].deliverables && data.phases[0].deliverables.length > 0;
            if (!hasRealData || true) {
                console.log("Injecting dummy data for Advanced Gantt");
                const now = new Date();
                const addDays = (days) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() + days);
                    return d.toISOString().split('T')[0];
                };

                const dummyPhases = [
                    {
                        id: 101,
                        name: 'Phase 1: Planning & Research',
                        status: 'completed',
                        start_date: addDays(-30),
                        end_date: addDays(-10),
                        deliverables: [
                            { id: 201, name: 'Project Charter', status: 'approved', start_date: addDays(-30), end_date: addDays(-25) },
                            { id: 202, name: 'Market Analysis', status: 'approved', start_date: addDays(-25), end_date: addDays(-15) },
                            { id: 203, name: 'Technical Feasibility', status: 'approved', start_date: addDays(-15), end_date: addDays(-10) }
                        ]
                    },
                    {
                        id: 102,
                        name: 'Phase 2: UI/UX Design',
                        status: 'in_progress',
                        start_date: addDays(-5),
                        end_date: addDays(25),
                        deliverables: [
                            { id: 204, name: 'Wireframes (Low-fi)', status: 'approved', start_date: addDays(-5), end_date: addDays(5) },
                            { id: 205, name: 'Interactive Prototype', status: 'in_progress', start_date: addDays(5), end_date: addDays(15) },
                            { id: 206, name: 'Design System', status: 'pending', start_date: addDays(10), end_date: addDays(25) }
                        ]
                    },
                    {
                        id: 103,
                        name: 'Phase 3: Core Development',
                        status: 'pending',
                        start_date: addDays(26),
                        end_date: addDays(60),
                        deliverables: [
                            { id: 207, name: 'Database Schema', status: 'pending', start_date: addDays(26), end_date: addDays(35) },
                            { id: 208, name: 'API Endpoints', status: 'pending', start_date: addDays(30), end_date: addDays(50) },
                            { id: 209, name: 'Frontend Integration', status: 'pending', start_date: addDays(45), end_date: addDays(60) }
                        ]
                    }
                ];
                data = { ...data, phases: dummyPhases };
            }
            // -------------------------------------

            setProject(data);

            // Expand first for demo, but keep others collapsed
            const initialExpanded = {};
            if (data.phases.length > 0) initialExpanded[data.phases[1].id] = true;
            setExpandedPhases(initialExpanded);

        } catch (err) {
            console.error('Failed to fetch project details:', err);
            setError('Failed to load project details.');
        } finally {
            setLoading(false);
        }
    };

    // --- Interactive Handlers ---

    const togglePhase = (phaseId) => {
        setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
    };

    const expandAll = () => {
        const all = {};
        if (project && project.phases) {
            project.phases.forEach(p => all[p.id] = true);
            setExpandedPhases(all);
        }
    };

    const collapseAll = () => {
        setExpandedPhases({});
    };

    const addNewPhase = () => {
        const newId = Date.now();
        const newPhase = {
            id: newId,
            name: 'New Phase',
            status: 'draft',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            deliverables: []
        };
        const updatedProject = { ...project, phases: [...(project.phases || []), newPhase] };
        setProject(updatedProject);
        setExpandedPhases(prev => ({ ...prev, [newId]: true }));
    };

    const addNewTask = (phaseId) => {
        const newTask = {
            id: Date.now(),
            name: 'New Task',
            status: 'pending',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0]
        };

        const updatedPhases = project.phases.map(p => {
            if (p.id === phaseId) {
                return { ...p, deliverables: [...(p.deliverables || []), newTask] };
            }
            return p;
        });

        setProject({ ...project, phases: updatedPhases });
    };

    // --- Helpers ---

    const getBarStyle = (start, end) => {
        if (!start || !end) return { display: 'none' };

        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        const yearStart = timelineStart.getTime();

        const leftPercent = ((startTime - yearStart) / totalDuration) * 100;
        const widthPercent = ((endTime - startTime) / totalDuration) * 100;

        return {
            left: `${Math.max(0, leftPercent)}%`,
            width: `${Math.max(0.5, widthPercent)}%`
        };
    };

    const getPhaseMetrics = (phase) => {
        const total = phase.deliverables?.length || 0;
        if (total === 0) return { total: 0, percent: 0 };
        const completed = phase.deliverables.filter(d => ['approved', 'completed'].includes(d.status)).length;
        const percent = Math.round((completed / total) * 100);
        return { total, percent };
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!project) return <div className="error-message">Project not found</div>;

    return (
        <div className="project-detail-wrapper">
            <div className="project-detail-container">
                {/* Header Section */}
                <div className="project-header">
                    <div className="project-title-section">
                        <div>
                            <h1>{project.name}</h1>
                            <div className="project-dates">
                                <Calendar size={16} />
                                <span>{currentYear} Roadmap</span>
                            </div>
                        </div>
                        <span className={`project-status-badge ${project.status || 'draft'}`}>
                            {project.status || 'Draft'}
                        </span>
                    </div>
                </div>

                {/* Advanced Gantt Chart */}
                <div className="roadmap-container">

                    {/* Toolbar: Global Controls */}
                    <div className="gantt-toolbar">
                        <button className="toolbar-btn" onClick={expandAll}>
                            <ChevronDown size={16} /> Expand All
                        </button>
                        <button className="toolbar-btn" onClick={collapseAll}>
                            <ChevronRight size={16} /> Collapse All
                        </button>
                    </div>

                    {/* Fixed Gantt Header */}
                    <div className="roadmap-header-container">
                        <div className="task-list-header">
                            Project Tasks
                        </div>
                        <div className="time-grid-header">
                            <div className="header-months-row">
                                {gridMonths.map(m => (
                                    <div key={m.key} className="header-month-cell">
                                        <span className="month-label">{m.label}</span>
                                        {/* Optional tick marks or subtext */}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Phase Rows */}
                    {project.phases && project.phases.map(phase => {
                        const { total, percent } = getPhaseMetrics(phase);
                        const isExpanded = !!expandedPhases[phase.id];

                        return (
                            <div key={phase.id} className="phase-roadmap-section">
                                {/* Phase Header Row */}
                                <div className="phase-roadmap-header">
                                    <div className="phase-header-left" onClick={() => togglePhase(phase.id)}>
                                        {isExpanded ? (
                                            <ChevronDown className="expand-icon expanded" size={18} />
                                        ) : (
                                            <ChevronRight className="expand-icon" size={18} />
                                        )}
                                        <h3>{phase.name}</h3>

                                        {/* Inline Actions (Hover) */}
                                        <div className="inline-actions" onClick={(e) => e.stopPropagation()}>
                                            <button className="action-btn" title="Edit Phase"><Pencil size={14} /></button>
                                            <button className="action-btn" title="More Options"><MoreHorizontal size={14} /></button>
                                        </div>
                                    </div>

                                    <div className="phase-header-right">
                                        {!isExpanded ? (
                                            <div className="phase-summary-widget" onClick={() => togglePhase(phase.id)}>
                                                <span className="summary-badge">Total {total} Tasks ({percent}% Done)</span>
                                                <div className="summary-metrics">
                                                    <div className="summary-progress-bar">
                                                        <div className="summary-progress-fill" style={{ width: `${percent}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Expanded: Show Grid Lines overlapping empty space */
                                            <div className="grid-lines-layer">
                                                {gridMonths.map(m => <div key={m.key} className="grid-line-col"></div>)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Phase Content */}
                                {isExpanded && (
                                    <div className="phase-body">
                                        {/* Task List Panel */}
                                        <div className="task-list-panel">
                                            {phase.deliverables && phase.deliverables.map(d => (
                                                <div key={d.id} className="task-item">
                                                    <div className="task-name-group">
                                                        <div className={`task-status-dot ${d.status}`}></div>
                                                        <span className="task-name" title={d.name}>{d.name}</span>
                                                    </div>

                                                    {/* Inline Actions (Hover) */}
                                                    <div className="inline-actions">
                                                        <button className="action-btn"><Pencil size={12} /></button>
                                                        <button className="action-btn"><MoreHorizontal size={12} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Add Task Button (Inline) */}
                                            <div className="add-task-btn-row" onClick={() => addNewTask(phase.id)}>
                                                <Plus size={14} className="add-icon-small" /> Add Task
                                            </div>
                                        </div>

                                        {/* Time Grid Panel */}
                                        <div className="time-grid-panel">
                                            {/* Grid Lines */}
                                            <div className="grid-lines-layer">
                                                {gridMonths.map(m => <div key={m.key} className="grid-line-col"></div>)}
                                            </div>

                                            {/* Gantt Bars */}
                                            <div className="gantt-rows-container">
                                                {phase.deliverables && phase.deliverables.map(d => (
                                                    <div key={d.id} className="gantt-row">
                                                        <div
                                                            className={`gantt-bar ${d.status}`}
                                                            style={getBarStyle(d.start_date, d.end_date)}
                                                            data-tooltip={`${d.name} (${new Date(d.start_date).toLocaleDateString()} - ${new Date(d.end_date).toLocaleDateString()})`}
                                                        ></div>
                                                    </div>
                                                ))}
                                                {/* Spacer for "Add Task" row alignment */}
                                                <div className="gantt-row" style={{ borderBottom: 'none' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Global Add Phase Button */}
                    <div className="add-phase-btn-global" onClick={addNewPhase}>
                        <Plus size={18} /> Add New Phase
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
