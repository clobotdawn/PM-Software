import { query } from '../config/database.js';

// Template operations
export const createTemplate = async (templateData) => {
    const { name, description, category, createdBy } = templateData;

    const result = await query(
        `INSERT INTO project_templates (name, description, category, created_by) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
        [name, description, category, createdBy]
    );

    return result.rows[0];
};

export const getAllTemplates = async () => {
    const result = await query(
        `SELECT pt.*, 
            u.first_name || ' ' || u.last_name as creator_name,
            COUNT(DISTINCT tp.id) as phase_count
     FROM project_templates pt
     LEFT JOIN users u ON pt.created_by = u.id
     LEFT JOIN template_phases tp ON pt.id = tp.template_id
     WHERE pt.is_active = true
     GROUP BY pt.id, u.first_name, u.last_name
     ORDER BY pt.created_at DESC`,
        []
    );
    return result.rows;
};

export const getTemplateById = async (id) => {
    const result = await query(
        `SELECT pt.*, 
            u.first_name || ' ' || u.last_name as creator_name
     FROM project_templates pt
     LEFT JOIN users u ON pt.created_by = u.id
     WHERE pt.id = $1`,
        [id]
    );
    return result.rows[0];
};

// Template phases
export const createTemplatePhase = async (phaseData) => {
    const { templateId, name, description, phaseOrder, defaultDurationDays } = phaseData;

    const result = await query(
        `INSERT INTO template_phases (template_id, name, description, phase_order, default_duration_days) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
        [templateId, name, description, phaseOrder, defaultDurationDays]
    );

    return result.rows[0];
};

export const getTemplatePhases = async (templateId) => {
    const result = await query(
        `SELECT tp.*,
            COUNT(DISTINCT td.id) as deliverable_count
     FROM template_phases tp
     LEFT JOIN template_deliverables td ON tp.id = td.phase_id
     WHERE tp.template_id = $1
     GROUP BY tp.id
     ORDER BY tp.phase_order`,
        [templateId]
    );
    return result.rows;
};

// Template deliverables
export const createTemplateDeliverable = async (deliverableData) => {
    const { phaseId, name, description, deliverableType, isAiGeneratable, templateContent } = deliverableData;

    const result = await query(
        `INSERT INTO template_deliverables (phase_id, name, description, deliverable_type, is_ai_generatable, template_content) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
        [phaseId, name, description, deliverableType, isAiGeneratable || false, templateContent]
    );

    return result.rows[0];
};

export const getTemplateDeliverables = async (phaseId) => {
    const result = await query(
        'SELECT * FROM template_deliverables WHERE phase_id = $1 ORDER BY name',
        [phaseId]
    );
    return result.rows;
};

export const getTemplateDeliverablesForTemplate = async (templateId) => {
    const result = await query(
        `SELECT td.*, tp.name as phase_name, tp.phase_order
     FROM template_deliverables td
     JOIN template_phases tp ON td.phase_id = tp.id
     WHERE tp.template_id = $1
     ORDER BY tp.phase_order, td.name`,
        [templateId]
    );
    return result.rows;
};

// Initialize project from template
export const initializeProjectFromTemplate = async (templateId, projectId) => {
    // Get template phases
    const phases = await getTemplatePhases(templateId);

    const createdPhases = [];
    for (const phase of phases) {
        // Create project phase
        const phaseResult = await query(
            `INSERT INTO project_phases (project_id, template_phase_id, name, description, phase_order, status) 
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
            [projectId, phase.id, phase.name, phase.description, phase.phase_order]
        );

        const createdPhase = phaseResult.rows[0];
        createdPhases.push(createdPhase);

        // Get template deliverables for this phase
        const deliverables = await getTemplateDeliverables(phase.id);

        // Create project deliverables
        for (const deliverable of deliverables) {
            await query(
                `INSERT INTO deliverables (project_id, phase_id, template_deliverable_id, name, description, deliverable_type, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
                [projectId, createdPhase.id, deliverable.id, deliverable.name, deliverable.description, deliverable.deliverable_type]
            );
        }
    }

    return createdPhases;
};
