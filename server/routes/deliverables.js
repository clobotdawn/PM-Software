import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import * as DeliverableModel from '../models/Deliverable.js';
import * as ProjectModel from '../models/Project.js';
import { generateDeliverable } from '../services/aiService.js';
import { logActivity } from '../services/workflowEngine.js';
import Joi from 'joi';

const router = express.Router();

// Validation schema
const createDeliverableSchema = Joi.object({
    projectId: Joi.number().required(),
    phaseId: Joi.number().required(),
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    deliverableType: Joi.string().required(),
    assignedTo: Joi.number(),
    dueDate: Joi.date()
});

/**
 * @route   GET /api/deliverables/project/:projectId
 * @desc    Get all deliverables for a project
 * @access  Private
 */
router.get('/project/:projectId', authMiddleware, async (req, res) => {
    try {
        const deliverables = await DeliverableModel.getDeliverablesByProject(req.params.projectId);
        res.json(deliverables);
    } catch (error) {
        console.error('Get deliverables error:', error);
        res.status(500).json({ error: 'Failed to fetch deliverables' });
    }
});

/**
 * @route   GET /api/deliverables/user/:userId
 * @desc    Get deliverables assigned to a user
 * @access  Private
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        // Users can only see their own deliverables unless admin
        if (req.user.role !== 'admin' && req.user.userId !== parseInt(req.params.userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const deliverables = await DeliverableModel.getDeliverablesByUser(req.params.userId);
        res.json(deliverables);
    } catch (error) {
        console.error('Get user deliverables error:', error);
        res.status(500).json({ error: 'Failed to fetch deliverables' });
    }
});

/**
 * @route   GET /api/deliverables/:id
 * @desc    Get deliverable by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const deliverable = await DeliverableModel.getDeliverableById(req.params.id);

        if (!deliverable) {
            return res.status(404).json({ error: 'Deliverable not found' });
        }

        // Get versions
        const versions = await DeliverableModel.getDeliverableVersions(deliverable.id);

        res.json({
            ...deliverable,
            versions
        });
    } catch (error) {
        console.error('Get deliverable error:', error);
        res.status(500).json({ error: 'Failed to fetch deliverable' });
    }
});

/**
 * @route   POST /api/deliverables
 * @desc    Create a new deliverable
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { error, value } = createDeliverableSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const deliverable = await DeliverableModel.createDeliverable(value);

        await logActivity(value.projectId, req.user.userId, 'deliverable_created',
            `Deliverable "${value.name}" created`);

        res.status(201).json({
            message: 'Deliverable created successfully',
            deliverable
        });
    } catch (error) {
        console.error('Create deliverable error:', error);
        res.status(500).json({ error: 'Failed to create deliverable' });
    }
});

/**
 * @route   POST /api/deliverables/:id/generate
 * @desc    Generate deliverable content using AI
 * @access  Private
 */
router.post('/:id/generate', authMiddleware, async (req, res) => {
    try {
        const deliverable = await DeliverableModel.getDeliverableById(req.params.id);

        if (!deliverable) {
            return res.status(404).json({ error: 'Deliverable not found' });
        }

        // Get project and phase data for context
        const project = await ProjectModel.getProjectById(deliverable.project_id);
        const phases = await ProjectModel.getProjectPhases(deliverable.project_id);
        const currentPhase = phases.find(p => p.id === deliverable.phase_id);

        // Get template content
        const { template_content, deliverable_type } = deliverable;

        // Generate content using AI
        const generatedContent = await generateDeliverable({
            deliverableName: deliverable.name,
            deliverableType: deliverable_type || deliverable.deliverable_type,
            templateContent: template_content,
            projectData: {
                name: project.name,
                description: project.description
            },
            phaseData: currentPhase ? {
                name: currentPhase.name,
                description: currentPhase.description,
                startDate: currentPhase.start_date,
                endDate: currentPhase.end_date
            } : null
        });

        // Update deliverable with generated content
        const updatedDeliverable = await DeliverableModel.updateDeliverable(deliverable.id, {
            content: generatedContent,
            isAiGenerated: true,
            status: 'review'
        });

        // Create version
        const latestVersion = await DeliverableModel.getLatestVersionNumber(deliverable.id);
        await DeliverableModel.createDeliverableVersion({
            deliverableId: deliverable.id,
            versionNumber: latestVersion + 1,
            content: generatedContent,
            createdBy: req.user.userId,
            changeNotes: 'AI-generated content'
        });

        await logActivity(project.id, req.user.userId, 'deliverable_generated',
            `Deliverable "${deliverable.name}" generated using AI`);

        res.json({
            message: 'Deliverable generated successfully',
            deliverable: updatedDeliverable
        });
    } catch (error) {
        console.error('Generate deliverable error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate deliverable' });
    }
});

/**
 * @route   PUT /api/deliverables/:id
 * @desc    Update deliverable
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const deliverable = await DeliverableModel.getDeliverableById(req.params.id);

        if (!deliverable) {
            return res.status(404).json({ error: 'Deliverable not found' });
        }

        // If content is being updated, create a new version
        if (req.body.content && req.body.content !== deliverable.content) {
            const latestVersion = await DeliverableModel.getLatestVersionNumber(deliverable.id);
            await DeliverableModel.createDeliverableVersion({
                deliverableId: deliverable.id,
                versionNumber: latestVersion + 1,
                content: req.body.content,
                createdBy: req.user.userId,
                changeNotes: req.body.changeNotes || 'Updated content'
            });
        }

        const updatedDeliverable = await DeliverableModel.updateDeliverable(req.params.id, req.body);

        await logActivity(deliverable.project_id, req.user.userId, 'deliverable_updated',
            `Deliverable "${deliverable.name}" updated`);

        res.json({
            message: 'Deliverable updated successfully',
            deliverable: updatedDeliverable
        });
    } catch (error) {
        console.error('Update deliverable error:', error);
        res.status(500).json({ error: 'Failed to update deliverable' });
    }
});

/**
 * @route   DELETE /api/deliverables/:id
 * @desc    Delete deliverable
 * @access  Private (Admin or PM)
 */
router.delete('/:id', authMiddleware, roleMiddleware('admin', 'pm'), async (req, res) => {
    try {
        await DeliverableModel.deleteDeliverable(req.params.id);
        res.json({ message: 'Deliverable deleted successfully' });
    } catch (error) {
        console.error('Delete deliverable error:', error);
        res.status(500).json({ error: 'Failed to delete deliverable' });
    }
});

/**
 * @route   PATCH /api/deliverables/:id/status
 * @desc    Update deliverable status
 * @access  Private
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const deliverable = await DeliverableModel.getDeliverableById(req.params.id);

        if (!deliverable) {
            return res.status(404).json({ error: 'Deliverable not found' });
        }

        const validStatuses = ['pending', 'in_progress', 'review', 'approved', 'rejected'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const updatedDeliverable = await DeliverableModel.updateDeliverable(req.params.id, { status });

        await logActivity(deliverable.project_id, req.user.userId, 'deliverable_updated',
            `Deliverable "${deliverable.name}" status updated to ${status}`);

        res.json({
            message: 'Deliverable status updated successfully',
            deliverable: updatedDeliverable
        });
    } catch (error) {
        console.error('Update deliverable status error:', error);
        res.status(500).json({ error: 'Failed to update deliverable status' });
    }
});

export default router;
