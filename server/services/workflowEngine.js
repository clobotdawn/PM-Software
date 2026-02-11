import { query } from '../config/database.js';
import { updatePhaseStatus } from '../models/Project.js';
import { sendNotification } from './notificationService.js';

/**
 * Workflow Engine - Manages project lifecycle automation
 */

// Project state transitions
const PROJECT_STATES = {
    draft: ['active', 'cancelled'],
    active: ['on_hold', 'completed', 'cancelled'],
    on_hold: ['active', 'cancelled'],
    completed: [],
    cancelled: []
};

// Phase state transitions
const PHASE_STATES = {
    pending: ['in_progress'],
    in_progress: ['completed', 'blocked'],
    blocked: ['in_progress'],
    completed: []
};

/**
 * Validate and execute project status transition
 */
export const transitionProjectStatus = async (projectId, newStatus, userId) => {
    const projectResult = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    const project = projectResult.rows[0];

    if (!project) {
        throw new Error('Project not found');
    }

    const currentStatus = project.status;
    const allowedTransitions = PROJECT_STATES[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        throw new Error(`Invalid transition from ${currentStatus} to ${newStatus}`);
    }

    // Update project status
    const updateResult = await query(
        'UPDATE projects SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [newStatus, projectId]
    );

    // Log activity
    await logActivity(projectId, userId, 'project_status_change',
        `Project status changed from ${currentStatus} to ${newStatus}`);

    // Handle post-transition actions
    await handleProjectStatusChange(project, newStatus, userId);

    return updateResult.rows[0];
};

/**
 * Handle phase progression and automation
 */
export const progressPhase = async (phaseId, newStatus, userId) => {
    const phaseResult = await query('SELECT * FROM project_phases WHERE id = $1', [phaseId]);
    const phase = phaseResult.rows[0];

    if (!phase) {
        throw new Error('Phase not found');
    }

    const currentStatus = phase.status;
    const allowedTransitions = PHASE_STATES[currentStatus];

    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
        throw new Error(`Invalid phase transition from ${currentStatus} to ${newStatus}`);
    }

    // Update phase status
    const updatedPhase = await updatePhaseStatus(phaseId, newStatus);

    // Log activity
    await logActivity(phase.project_id, userId, 'phase_status_change',
        `Phase "${phase.name}" status changed to ${newStatus}`);

    // Handle post-transition actions
    await handlePhaseStatusChange(phase, newStatus, userId);

    return updatedPhase;
};

/**
 * Auto-progress to next phase when current phase is completed
 */
export const autoProgressToNextPhase = async (projectId, currentPhaseOrder) => {
    // Get next phase
    const nextPhaseResult = await query(
        `SELECT * FROM project_phases 
     WHERE project_id = $1 AND phase_order = $2 AND status = 'pending'`,
        [projectId, currentPhaseOrder + 1]
    );

    if (nextPhaseResult.rows.length > 0) {
        const nextPhase = nextPhaseResult.rows[0];

        // Auto-start next phase
        await updatePhaseStatus(nextPhase.id, 'in_progress');

        // Notify stakeholders
        const stakeholdersResult = await query(
            'SELECT user_id FROM phase_stakeholders WHERE phase_id = $1',
            [nextPhase.id]
        );

        for (const stakeholder of stakeholdersResult.rows) {
            await sendNotification(
                stakeholder.user_id,
                'Phase Started',
                `Phase "${nextPhase.name}" has automatically started`,
                'phase_start',
                projectId
            );
        }

        await logActivity(projectId, null, 'phase_auto_start',
            `Phase "${nextPhase.name}" automatically started`);

        return nextPhase;
    }

    return null;
};

/**
 * Check if all deliverables in a phase are completed
 */
export const checkPhaseCompletion = async (phaseId) => {
    const result = await query(
        `SELECT 
       COUNT(*) as total,
       COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
     FROM deliverables 
     WHERE phase_id = $1`,
        [phaseId]
    );

    const { total, approved } = result.rows[0];
    return parseInt(total) === parseInt(approved) && parseInt(total) > 0;
};

/**
 * Handle automatic actions when project status changes
 */
const handleProjectStatusChange = async (project, newStatus, userId) => {
    switch (newStatus) {
        case 'active':
            // Start first phase if not started
            const firstPhaseResult = await query(
                `SELECT * FROM project_phases 
         WHERE project_id = $1 AND phase_order = 1`,
                [project.id]
            );

            if (firstPhaseResult.rows.length > 0) {
                const firstPhase = firstPhaseResult.rows[0];
                if (firstPhase.status === 'pending') {
                    await updatePhaseStatus(firstPhase.id, 'in_progress');
                }
            }

            // Notify PM
            await sendNotification(
                project.pm_id,
                'Project Activated',
                `Project "${project.name}" is now active`,
                'project_activated',
                project.id
            );
            break;

        case 'completed':
            // Notify all stakeholders
            const stakeholdersResult = await query(
                `SELECT DISTINCT user_id FROM phase_stakeholders ps
         JOIN project_phases pp ON ps.phase_id = pp.id
         WHERE pp.project_id = $1`,
                [project.id]
            );

            for (const stakeholder of stakeholdersResult.rows) {
                await sendNotification(
                    stakeholder.user_id,
                    'Project Completed',
                    `Project "${project.name}" has been completed`,
                    'project_completed',
                    project.id
                );
            }
            break;

        default:
            break;
    }
};

/**
 * Handle automatic actions when phase status changes
 */
const handlePhaseStatusChange = async (phase, newStatus, userId) => {
    switch (newStatus) {
        case 'completed':
            // Check if this triggers next phase
            const nextPhase = await autoProgressToNextPhase(phase.project_id, phase.phase_order);

            // Check if all phases are completed -> complete project
            const allPhasesResult = await query(
                `SELECT 
           COUNT(*) as total,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM project_phases 
         WHERE project_id = $1`,
                [phase.project_id]
            );

            const { total, completed } = allPhasesResult.rows[0];
            if (parseInt(total) === parseInt(completed)) {
                // Auto-complete project
                await transitionProjectStatus(phase.project_id, 'completed', userId);
            }
            break;

        case 'in_progress':
            // Notify assigned stakeholders
            const stakeholdersResult = await query(
                'SELECT user_id FROM phase_stakeholders WHERE phase_id = $1',
                [phase.id]
            );

            for (const stakeholder of stakeholdersResult.rows) {
                await sendNotification(
                    stakeholder.user_id,
                    'Phase In Progress',
                    `Phase "${phase.name}" is now in progress`,
                    'phase_in_progress',
                    phase.project_id
                );
            }
            break;

        default:
            break;
    }
};

/**
 * Check for upcoming deadlines and send notifications
 */
export const checkDeadlines = async () => {
    // Check phase deadlines (3 days before)
    const upcomingPhaseDeadlines = await query(
        `SELECT pp.*, p.name as project_name, p.pm_id
     FROM project_phases pp
     JOIN projects p ON pp.project_id = p.id
     WHERE pp.status = 'in_progress'
       AND pp.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
        []
    );

    for (const phase of upcomingPhaseDeadlines.rows) {
        await sendNotification(
            phase.pm_id,
            'Phase Deadline Approaching',
            `Phase "${phase.name}" in project "${phase.project_name}" is due in 3 days`,
            'deadline_warning',
            phase.project_id
        );
    }

    // Check deliverable deadlines
    const upcomingDeliverableDeadlines = await query(
        `SELECT d.*, p.name as project_name, d.assigned_to
     FROM deliverables d
     JOIN projects p ON d.project_id = p.id
     WHERE d.status NOT IN ('approved', 'rejected')
       AND d.due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`,
        []
    );

    for (const deliverable of upcomingDeliverableDeadlines.rows) {
        if (deliverable.assigned_to) {
            await sendNotification(
                deliverable.assigned_to,
                'Deliverable Deadline Approaching',
                `Deliverable "${deliverable.name}" is due in 3 days`,
                'deadline_warning',
                deliverable.project_id
            );
        }
    }
};

/**
 * Log activity to activity log
 */
export const logActivity = async (projectId, userId, activityType, description, metadata = {}) => {
    await query(
        `INSERT INTO activity_logs (project_id, user_id, activity_type, description, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [projectId, userId, activityType, description, JSON.stringify(metadata)]
    );
};

/**
 * Get activity log for a project
 */
export const getActivityLog = async (projectId, limit = 50) => {
    const result = await query(
        `SELECT al.*, 
            u.first_name || ' ' || u.last_name as user_name
     FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     WHERE al.project_id = $1
     ORDER BY al.created_at DESC
     LIMIT $2`,
        [projectId, limit]
    );
    return result.rows;
};

export default {
    transitionProjectStatus,
    progressPhase,
    autoProgressToNextPhase,
    checkPhaseCompletion,
    checkDeadlines,
    logActivity,
    getActivityLog
};
