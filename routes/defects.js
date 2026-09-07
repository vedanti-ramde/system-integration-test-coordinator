const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// GET /api/defects - List all defects
router.get('/', async (req, res, next) => {
  try {
    const defects = await dataStore.readAll('defects');
    res.json(defects);
  } catch (err) {
    next(err);
  }
});

// GET /api/defects/:id - Get defect by ID
router.get('/:id', async (req, res, next) => {
  try {
    const defect = await dataStore.getById('defects', req.params.id);
    if (!defect) {
      return res.status(404).json({ error: `Defect with ID '${req.params.id}' not found.` });
    }
    res.json(defect);
  } catch (err) {
    next(err);
  }
});

// POST /api/defects - Create a new defect
router.post('/', async (req, res, next) => {
  try {
    const {
      id,
      title,
      description,
      relatedIntegrationId,
      severity,
      priority,
      status,
      assignedTo,
      reportedBy,
      createdDate,
      expectedResult,
      actualResult
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Defect title is required.' });
    }
    if (!relatedIntegrationId) {
      return res.status(400).json({ error: 'Related integration is required.' });
    }

    // Verify integration exists
    const integration = await dataStore.getById('integrations', relatedIntegrationId);
    if (!integration) {
      return res.status(400).json({ error: `Integration '${relatedIntegrationId}' does not exist.` });
    }

    const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
    const sev = validSeverities.includes(severity) ? severity : 'Medium';

    const validPriorities = ['P1', 'P2', 'P3', 'P4'];
    const prio = validPriorities.includes(priority) ? priority : 'P2';

    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];
    const stat = validStatuses.includes(status) ? status : 'Open';

    // Auto-generate defect ID if omitted
    let defId = id && id.trim() ? id.trim() : null;
    if (!defId) {
      const defects = await dataStore.readAll('defects');
      const maxNum = defects.reduce((max, d) => {
        const match = d.id.match(/^DEF-(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      defId = `DEF-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const integrationName = `${integration.sourceServiceName} → ${integration.targetServiceName} (${integration.endpoint})`;

    const newDefect = {
      id: defId,
      title: title.trim(),
      description: description ? description.trim() : '',
      relatedIntegrationId: integration.id,
      relatedIntegrationName: integrationName,
      severity: sev,
      priority: prio,
      status: stat,
      assignedTo: assignedTo && assignedTo.trim() ? assignedTo.trim() : 'Unassigned',
      reportedBy: reportedBy && reportedBy.trim() ? reportedBy.trim() : 'Anonymous',
      createdDate: createdDate ? createdDate.trim() : new Date().toISOString().slice(0, 10),
      expectedResult: expectedResult ? expectedResult.trim() : '',
      actualResult: actualResult ? actualResult.trim() : ''
    };

    const created = await dataStore.create('defects', newDefect);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/defects/:id - Update defect
router.put('/:id', async (req, res, next) => {
  try {
    const {
      title,
      description,
      relatedIntegrationId,
      severity,
      priority,
      status,
      assignedTo,
      reportedBy,
      createdDate,
      expectedResult,
      actualResult
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Defect title is required.' });
    }

    let integrationName;
    if (relatedIntegrationId) {
      const integration = await dataStore.getById('integrations', relatedIntegrationId);
      if (!integration) {
        return res.status(400).json({ error: `Integration '${relatedIntegrationId}' does not exist.` });
      }
      integrationName = `${integration.sourceServiceName} → ${integration.targetServiceName} (${integration.endpoint})`;
    }

    const validSeverities = ['Critical', 'High', 'Medium', 'Low'];
    const validPriorities = ['P1', 'P2', 'P3', 'P4'];
    const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed'];

    const updates = {
      title: title.trim(),
      description: description !== undefined ? description.trim() : '',
      severity: validSeverities.includes(severity) ? severity : 'Medium',
      priority: validPriorities.includes(priority) ? priority : 'P2',
      status: validStatuses.includes(status) ? status : 'Open',
      assignedTo: assignedTo ? assignedTo.trim() : 'Unassigned',
      reportedBy: reportedBy ? reportedBy.trim() : 'Anonymous',
      expectedResult: expectedResult !== undefined ? expectedResult.trim() : '',
      actualResult: actualResult !== undefined ? actualResult.trim() : ''
    };

    if (createdDate) updates.createdDate = createdDate;
    if (relatedIntegrationId) {
      updates.relatedIntegrationId = relatedIntegrationId;
      updates.relatedIntegrationName = integrationName;
    }

    const updated = await dataStore.update('defects', req.params.id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/defects/:id - Delete defect
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await dataStore.remove('defects', req.params.id);
    res.json({ message: 'Defect deleted successfully', defect: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
