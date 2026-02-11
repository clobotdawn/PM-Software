import { query } from '../config/database.js';

// Deliverable CRUD operations
export const createDeliverable = async (deliverableData) => {
    const {
        projectId,
        phaseId,
        templateDeliverableId,
        name,
        description,
        deliverableType,
        assignedTo,
        dueDate
    } = deliverableData;

    const result = await query(
        `INSERT INTO deliverables 
     (project_id, phase_id, template_deliverable_id, name, description, deliverable_type, assigned_to, due_date, status) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') 
     RETURNING *`,
        [projectId, phaseId, templateDeliverableId, name, description, deliverableType, assignedTo, dueDate]
    );

    return result.rows[0];
};

export const getDeliverableById = async (id) => {
    const result = await query(
        `SELECT d.*, 
            u.first_name || ' ' || u.last_name as assigned_to_name,
            pp.name as phase_name,
            p.name as project_name
     FROM deliverables d
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN project_phases pp ON d.phase_id = pp.id
     LEFT JOIN projects p ON d.project_id = p.id
     WHERE d.id = $1`,
        [id]
    );
    return result.rows[0];
};

export const getDeliverablesByProject = async (projectId) => {
    const result = await query(
        `SELECT d.*, 
            u.first_name || ' ' || u.last_name as assigned_to_name,
            pp.name as phase_name,
            pp.phase_order
     FROM deliverables d
     LEFT JOIN users u ON d.assigned_to = u.id
     LEFT JOIN project_phases pp ON d.phase_id = pp.id
     WHERE d.project_id = $1
     ORDER BY pp.phase_order, d.created_at`,
        [projectId]
    );
    return result.rows;
};

export const getDeliverablesByPhase = async (phaseId) => {
    const result = await query(
        `SELECT d.*, 
            u.first_name || ' ' || u.last_name as assigned_to_name
     FROM deliverables d
     LEFT JOIN users u ON d.assigned_to = u.id
     WHERE d.phase_id = $1
     ORDER BY d.created_at`,
        [phaseId]
    );
    return result.rows;
};

export const getDeliverablesByUser = async (userId) => {
    const result = await query(
        `SELECT d.*, 
            pp.name as phase_name,
            p.name as project_name,
            p.id as project_id
     FROM deliverables d
     LEFT JOIN project_phases pp ON d.phase_id = pp.id
     LEFT JOIN projects p ON d.project_id = p.id
     WHERE d.assigned_to = $1
     ORDER BY d.due_date NULLS LAST, d.created_at DESC`,
        [userId]
    );
    return result.rows;
};

export const updateDeliverable = async (id, updates) => {
    const allowedFields = [
        'name',
        'description',
        'status',
        'content',
        'file_path',
        'assigned_to',
        'due_date',
        'is_ai_generated'
    ];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            fields.push(`${key} = $${paramIndex}`);
            values.push(value);
            paramIndex++;
        }
    }

    // Auto-set completed_at when status changes to 'approved'
    if (updates.status === 'approved') {
        fields.push(`completed_at = $${paramIndex}`);
        values.push(new Date());
        paramIndex++;
    }

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(id);
    const result = await query(
        `UPDATE deliverables SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    return result.rows[0];
};

export const deleteDeliverable = async (id) => {
    const result = await query('DELETE FROM deliverables WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
};

// Deliverable versions
export const createDeliverableVersion = async (versionData) => {
    const { deliverableId, versionNumber, content, filePath, createdBy, changeNotes } = versionData;

    const result = await query(
        `INSERT INTO deliverable_versions 
     (deliverable_id, version_number, content, file_path, created_by, change_notes) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
        [deliverableId, versionNumber, content, filePath, createdBy, changeNotes]
    );

    return result.rows[0];
};

export const getDeliverableVersions = async (deliverableId) => {
    const result = await query(
        `SELECT dv.*, 
            u.first_name || ' ' || u.last_name as creator_name
     FROM deliverable_versions dv
     LEFT JOIN users u ON dv.created_by = u.id
     WHERE dv.deliverable_id = $1
     ORDER BY dv.version_number DESC`,
        [deliverableId]
    );
    return result.rows;
};

export const getLatestVersionNumber = async (deliverableId) => {
    const result = await query(
        'SELECT COALESCE(MAX(version_number), 0) as latest_version FROM deliverable_versions WHERE deliverable_id = $1',
        [deliverableId]
    );
    return result.rows[0].latest_version;
};

// Get AI-generatable deliverables
export const getAIGeneratableDeliverables = async (projectId) => {
    const result = await query(
        `SELECT d.*, 
            td.template_content,
            td.deliverable_type,
            pp.name as phase_name
     FROM deliverables d
     JOIN template_deliverables td ON d.template_deliverable_id = td.id
     JOIN project_phases pp ON d.phase_id = pp.id
     WHERE d.project_id = $1 
       AND td.is_ai_generatable = true
       AND d.status = 'pending'
     ORDER BY pp.phase_order`,
        [projectId]
    );
    return result.rows;
};
