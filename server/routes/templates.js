import express from 'express';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import * as TemplateModel from '../models/Template.js';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createTemplateSchema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow(''),
    category: Joi.string().required(),
    phases: Joi.array().items(Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow(''),
        phaseOrder: Joi.number().required(),
        defaultDurationDays: Joi.number(),
        deliverables: Joi.array().items(Joi.object({
            name: Joi.string().required(),
            description: Joi.string().allow(''),
            deliverableType: Joi.string().required(),
            isAiGeneratable: Joi.boolean(),
            templateContent: Joi.string().allow('')
        }))
    }))
});

/**
 * @route   GET /api/templates
 * @desc    Get all templates
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const templates = await TemplateModel.getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * @route   GET /api/templates/:id
 * @desc    Get template by ID with full details
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const template = await TemplateModel.getTemplateById(req.params.id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Get phases and deliverables
        const phases = await TemplateModel.getTemplatePhases(template.id);

        // Get deliverables for each phase
        for (const phase of phases) {
            phase.deliverables = await TemplateModel.getTemplateDeliverables(phase.id);
        }

        res.json({
            ...template,
            phases
        });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * @route   POST /api/templates
 * @desc    Create a new template
 * @access  Private (Admin only)
 */
router.post('/', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    try {
        const { error, value } = createTemplateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const { name, description, category, phases } = value;

        // Create template
        const template = await TemplateModel.createTemplate({
            name,
            description,
            category,
            createdBy: req.user.userId
        });

        // Create phases and deliverables
        if (phases && phases.length > 0) {
            for (const phaseData of phases) {
                const phase = await TemplateModel.createTemplatePhase({
                    templateId: template.id,
                    name: phaseData.name,
                    description: phaseData.description,
                    phaseOrder: phaseData.phaseOrder,
                    defaultDurationDays: phaseData.defaultDurationDays
                });

                // Create deliverables for this phase
                if (phaseData.deliverables && phaseData.deliverables.length > 0) {
                    for (const deliverableData of phaseData.deliverables) {
                        await TemplateModel.createTemplateDeliverable({
                            phaseId: phase.id,
                            name: deliverableData.name,
                            description: deliverableData.description,
                            deliverableType: deliverableData.deliverableType,
                            isAiGeneratable: deliverableData.isAiGeneratable || false,
                            templateContent: deliverableData.templateContent
                        });
                    }
                }
            }
        }

        res.status(201).json({
            message: 'Template created successfully',
            template
        });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

export default router;
