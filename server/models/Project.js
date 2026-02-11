import { query } from '../config/database.js';

// Project CRUD operations
export const createProject = async (projectData) => {
    const { templateId, name, description, pmId, startDate, endDate } = projectData;

    const result = await query(
        `INSERT INTO projects (template_id, name, description, pm_id, start_date, end_date, status) 
     VALUES ($1, $2, $3, $4, $5, $6, 'draft') 
     RETURNING *`,
        [templateId, name, description, pmId, startDate, endDate]
    );

    return result.rows[0];
};

export const getProjectById = async (id) => {
    const result = await query(
        `SELECT p.*, 
            u.first_name || ' ' || u.last_name as pm_name,
            pt.name as template_name
     FROM projects p
     LEFT JOIN users u ON p.pm_id = u.id
     LEFT JOIN project_templates pt ON p.template_id = pt.id
     WHERE p.id = $1`,
        [id]
    );
    return result.rows[0];
};

export const getProjectsByPM = async (pmId) => {
    const result = await query(
        `SELECT p.*, 
            pt.name as template_name,
            COUNT(DISTINCT pp.id) as phase_count,
            COUNT(DISTINCT d.id) as deliverable_count
     FROM projects p
     LEFT JOIN project_templates pt ON p.template_id = pt.id
     LEFT JOIN project_phases pp ON p.id = pp.project_id
     LEFT JOIN deliverables d ON p.id = d.project_id
     WHERE p.pm_id = $1
     GROUP BY p.id, pt.name
     ORDER BY p.created_at DESC`,
        [pmId]
    );
    return result.rows;
};

export const getAllProjects = async (filters = {}) => {
    let queryText = `
    SELECT p.*, 
           u.first_name || ' ' || u.last_name as pm_name,
           pt.name as template_name
    FROM projects p
    LEFT JOIN users u ON p.pm_id = u.id
    LEFT JOIN project_templates pt ON p.template_id = pt.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
        queryText += ` AND p.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
    }

    if (filters.pmId) {
        queryText += ` AND p.pm_id = $${paramIndex}`;
        params.push(filters.pmId);
        paramIndex++;
    }

    queryText += ' ORDER BY p.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
};

export const updateProject = async (id, updates) => {
    const allowedFields = ['name', 'description', 'status', 'start_date', 'end_date'];
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

    if (fields.length === 0) {
        throw new Error('No valid fields to update');
    }

    values.push(id);
    const result = await query(
        `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    return result.rows[0];
};

export const deleteProject = async (id) => {
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
};

// Client contacts
export const addClientContact = async (projectId, contactData) => {
    const { name, email, phone, role, isPrimary } = contactData;

    const result = await query(
        `INSERT INTO client_contacts (project_id, name, email, phone, role, is_primary) 
     VALUES ($1, $2, $3, $4, $5, $6) 
     RETURNING *`,
        [projectId, name, email, phone, role, isPrimary || false]
    );

    return result.rows[0];
};

export const getClientContacts = async (projectId) => {
    const result = await query(
        'SELECT * FROM client_contacts WHERE project_id = $1 ORDER BY is_primary DESC, name',
        [projectId]
    );
    return result.rows;
};

// Project phases
export const createProjectPhase = async (phaseData) => {
    const { projectId, templatePhaseId, name, description, phaseOrder, startDate, endDate } = phaseData;

    const result = await query(
        `INSERT INTO project_phases (project_id, template_phase_id, name, description, phase_order, start_date, end_date) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
        [projectId, templatePhaseId, name, description, phaseOrder, startDate, endDate]
    );

    return result.rows[0];
};

export const getProjectPhases = async (projectId) => {
    const result = await query(
        `SELECT pp.*,
            COUNT(DISTINCT d.id) as deliverable_count,
            COUNT(DISTINCT CASE WHEN d.status = 'approved' THEN d.id END) as approved_count
     FROM project_phases pp
     LEFT JOIN deliverables d ON pp.id = d.phase_id
     WHERE pp.project_id = $1
     GROUP BY pp.id
     ORDER BY pp.phase_order`,
        [projectId]
    );
    return result.rows;
};

export const updatePhaseStatus = async (phaseId, status, actualDates = {}) => {
    const updates = { status };

    if (status === 'in_progress' && !actualDates.actualStartDate) {
        updates.actual_start_date = new Date();
    } else if (actualDates.actualStartDate) {
        updates.actual_start_date = actualDates.actualStartDate;
    }

    if (status === 'completed' && !actualDates.actualEndDate) {
        updates.actual_end_date = new Date();
    } else if (actualDates.actualEndDate) {
        updates.actual_end_date = actualDates.actualEndDate;
    }

    const fields = Object.keys(updates).map((key, idx) => `${key} = $${idx + 1}`);
    const values = [...Object.values(updates), phaseId];

    const result = await query(
        `UPDATE project_phases SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
    );

    return result.rows[0];
};

// Phase stakeholders
export const addPhaseStakeholder = async (phaseId, userId, role) => {
    const result = await query(
        'INSERT INTO phase_stakeholders (phase_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
        [phaseId, userId, role]
    );
    return result.rows[0];
};

export const getPhaseStakeholders = async (phaseId) => {
    const result = await query(
        `SELECT ps.*, u.first_name, u.last_name, u.email
     FROM phase_stakeholders ps
     JOIN users u ON ps.user_id = u.id
     WHERE ps.phase_id = $1`,
        [phaseId]
    );
    return result.rows;
};
