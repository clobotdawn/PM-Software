import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import * as ProjectModel from '../models/Project.js';
import * as TemplateModel from '../models/Template.js';
import { transitionProjectStatus, logActivity, getActivityLog } from '../services/workflowEngine.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createProjectSchema = Joi.object({
    templateId: Joi.number().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    pmId: Joi.number().required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    contacts: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email(),
        phone: Joi.string(),
        role: Joi.string(),
        isPrimary: Joi.boolean()
    })),
    phases: Joi.array().items(Joi.object({
        phaseId: Joi.number().required(),
        startDate: Joi.date(),
        endDate: Joi.date(),
        stakeholders: Joi.array().items(Joi.object({
            userId: Joi.number().required(),
            role: Joi.string().required()
        }))
    }))
});

/**
 * @route   GET /api/projects
 * @desc    Get all projects (filtered by role)
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const filters = {};

        // PMs see only their projects, admins see all
        if (req.user.role === 'pm') {
            filters.pmId = req.user.userId;
        }

        if (req.query.status) {
            filters.status = req.query.status;
        }

        const projects = await ProjectModel.getAllProjects(filters);
        res.json(projects);
    } catch (error) {
        console.error('Get projects error:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await ProjectModel.getProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check permissions
        if (req.user.role === 'pm' && project.pm_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get additional details
        const phases = await ProjectModel.getProjectPhases(project.id);
        const contacts = await ProjectModel.getClientContacts(project.id);

        // Fetch all deliverables for the project
        const deliverables = await import('../models/Deliverable.js').then(m => m.getDeliverablesByProject(project.id));

        // Map deliverables to phases
        const phasesWithDeliverables = phases.map(phase => {
            return {
                ...phase,
                deliverables: deliverables.filter(d => d.phase_id === phase.id)
            };
        });

        res.json({
            ...project,
            phases: phasesWithDeliverables,
            contacts
        });
    } catch (error) {
        console.error('Get project error:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private (Admin/PM)
 */
router.post('/', authMiddleware, roleMiddleware('admin', 'pm'), async (req, res) => {
    try {
        const { error, value } = createProjectSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { templateId, name, description, pmId, startDate, endDate, contacts, phases } = value;

        // Create project
        const project = await ProjectModel.createProject({
            templateId,
            name,
            description,
            pmId,
            startDate,
            endDate
        });

        // Initialize project from template
        await TemplateModel.initializeProjectFromTemplate(templateId, project.id);

        // Add client contacts
        if (contacts && contacts.length > 0) {
            for (const contact of contacts) {
                await ProjectModel.addClientContact(project.id, contact);
            }
        }

        // Update phases with dates and stakeholders
        if (phases && phases.length > 0) {
            const projectPhases = await ProjectModel.getProjectPhases(project.id);

            for (const phaseUpdate of phases) {
                const matchingPhase = projectPhases.find(p => p.template_phase_id === phaseUpdate.phaseId);

                if (matchingPhase) {
                    // Update phase dates
                    if (phaseUpdate.startDate || phaseUpdate.endDate) {
                        await ProjectModel.updatePhaseStatus(matchingPhase.id, matchingPhase.status, {
                            actualStartDate: phaseUpdate.startDate,
                            actualEndDate: phaseUpdate.endDate
                        });
                    }

                    // Add stakeholders
                    if (phaseUpdate.stakeholders && phaseUpdate.stakeholders.length > 0) {
                        for (const stakeholder of phaseUpdate.stakeholders) {
                            await ProjectModel.addPhaseStakeholder(matchingPhase.id, stakeholder.userId, stakeholder.role);
                        }
                    }
                }
            }
        }

        // Log activity
        await logActivity(project.id, req.user.userId, 'project_created', `Project "${name}" created`);

        res.status(201).json({
            message: 'Project created successfully',
            project
        });
    } catch (error) {
        console.error('Create project error:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (PM of project or Admin)
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await ProjectModel.getProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check permissions
        if (req.user.role !== 'admin' && project.pm_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updatedProject = await ProjectModel.updateProject(req.params.id, req.body);

        await logActivity(project.id, req.user.userId, 'project_updated', 'Project details updated');

        res.json({
            message: 'Project updated successfully',
            project: updatedProject
        });
    } catch (error) {
        console.error('Update project error:', error);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

/**
 * @route   PUT /api/projects/:id/status
 * @desc    Update project status
 * @access  Private (PM of project or Admin)
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const project = await ProjectModel.getProjectById(req.params.id);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check permissions
        if (req.user.role !== 'admin' && project.pm_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const updatedProject = await transitionProjectStatus(req.params.id, status, req.user.userId);

        res.json({
            message: 'Project status updated successfully',
            project: updatedProject
        });
    } catch (error) {
        console.error('Update project status error:', error);
        res.status(500).json({ error: error.message || 'Failed to update project status' });
    }
});

/**
 * @route   GET /api/projects/:id/activity
 * @desc    Get project activity log
 * @access  Private
 */
router.get('/:id/activity', authMiddleware, async (req, res) => {
    try {
        const activities = await getActivityLog(req.params.id, 100);
        res.json(activities);
    } catch (error) {
        console.error('Get activity log error:', error);
        res.status(500).json({ error: 'Failed to fetch activity log' });
    }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private (Admin only)
 */
router.delete('/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        await ProjectModel.deleteProject(req.params.id);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Delete project error:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

export default router;
