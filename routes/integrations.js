const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// GET /api/integrations - List all integrations
router.get('/', async (req, res, next) => {
  try {
    const integrations = await dataStore.readAll('integrations');
    res.json(integrations);
  } catch (err) {
    next(err);
  }
});

// GET /api/integrations/:id - Get integration by ID
router.get('/:id', async (req, res, next) => {
  try {
    const integration = await dataStore.getById('integrations', req.params.id);
    if (!integration) {
      return res.status(404).json({ error: `Integration with ID '${req.params.id}' not found.` });
    }
    res.json(integration);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations - Create integration
router.post('/', async (req, res, next) => {
  try {
    const {
      id,
      sourceServiceId,
      targetServiceId,
      endpoint,
      httpMethod,
      authType,
      environment,
      status,
      description
    } = req.body;

    // Validate presence of services
    if (!sourceServiceId) {
      return res.status(400).json({ error: 'Source service is required.' });
    }
    if (!targetServiceId) {
      return res.status(400).json({ error: 'Target service is required.' });
    }
    if (sourceServiceId === targetServiceId) {
      return res.status(400).json({ error: 'Source and Target services cannot be identical.' });
    }

    // Verify both services exist in database
    const services = await dataStore.readAll('services');
    const sourceService = services.find(s => s.id === sourceServiceId);
    const targetService = services.find(s => s.id === targetServiceId);

    if (!sourceService) {
      return res.status(400).json({ error: `Source service '${sourceServiceId}' does not exist.` });
    }
    if (!targetService) {
      return res.status(400).json({ error: `Target service '${targetServiceId}' does not exist.` });
    }

    if (!endpoint || !endpoint.trim()) {
      return res.status(400).json({ error: 'API Endpoint is required (e.g. /api/v1/orders).' });
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const method = validMethods.includes(httpMethod ? httpMethod.toUpperCase() : '')
      ? httpMethod.toUpperCase()
      : 'GET';

    const validAuth = ['None', 'API Key', 'Bearer Token', 'OAuth 2.0'];
    const auth = validAuth.includes(authType) ? authType : 'Bearer Token';

    const validStatuses = ['Healthy', 'Warning', 'Failed', 'Not Tested'];
    const intStatus = validStatuses.includes(status) ? status : 'Not Tested';

    // Auto-generate ID if omitted
    let intId = id && id.trim() ? id.trim() : null;
    if (!intId) {
      const integrations = await dataStore.readAll('integrations');
      const maxNum = integrations.reduce((max, i) => {
        const match = i.id.match(/^INT-(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      intId = `INT-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const newIntegration = {
      id: intId,
      sourceServiceId: sourceService.id,
      sourceServiceName: sourceService.name,
      targetServiceId: targetService.id,
      targetServiceName: targetService.name,
      endpoint: endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`,
      httpMethod: method,
      authType: auth,
      environment: environment && environment.trim() ? environment.trim() : 'QA',
      status: intStatus,
      description: description ? description.trim() : ''
    };

    const created = await dataStore.create('integrations', newIntegration);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/integrations/:id - Update integration
router.put('/:id', async (req, res, next) => {
  try {
    const {
      sourceServiceId,
      targetServiceId,
      endpoint,
      httpMethod,
      authType,
      environment,
      status,
      description
    } = req.body;

    if (!sourceServiceId || !targetServiceId) {
      return res.status(400).json({ error: 'Both Source and Target services are required.' });
    }
    if (sourceServiceId === targetServiceId) {
      return res.status(400).json({ error: 'Source and Target services cannot be identical.' });
    }

    const services = await dataStore.readAll('services');
    const sourceService = services.find(s => s.id === sourceServiceId);
    const targetService = services.find(s => s.id === targetServiceId);

    if (!sourceService) {
      return res.status(400).json({ error: `Source service '${sourceServiceId}' does not exist.` });
    }
    if (!targetService) {
      return res.status(400).json({ error: `Target service '${targetServiceId}' does not exist.` });
    }

    if (!endpoint || !endpoint.trim()) {
      return res.status(400).json({ error: 'API Endpoint is required.' });
    }

    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    const method = validMethods.includes(httpMethod ? httpMethod.toUpperCase() : '')
      ? httpMethod.toUpperCase()
      : 'GET';

    const validAuth = ['None', 'API Key', 'Bearer Token', 'OAuth 2.0'];
    const auth = validAuth.includes(authType) ? authType : 'Bearer Token';

    const validStatuses = ['Healthy', 'Warning', 'Failed', 'Not Tested'];
    const intStatus = validStatuses.includes(status) ? status : 'Not Tested';

    const updated = await dataStore.update('integrations', req.params.id, {
      sourceServiceId: sourceService.id,
      sourceServiceName: sourceService.name,
      targetServiceId: targetService.id,
      targetServiceName: targetService.name,
      endpoint: endpoint.trim().startsWith('/') ? endpoint.trim() : `/${endpoint.trim()}`,
      httpMethod: method,
      authType: auth,
      environment: environment && environment.trim() ? environment.trim() : 'QA',
      status: intStatus,
      description: description ? description.trim() : ''
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/integrations/:id - Delete integration
router.delete('/:id', async (req, res, next) => {
  try {
    const integrationId = req.params.id;

    // Check if any defects reference this integration
    const defects = await dataStore.readAll('defects');
    const referencingDefects = defects.filter(
      d => d.relatedIntegrationId === integrationId && d.status !== 'Closed'
    );

    if (referencingDefects.length > 0) {
      const defIds = referencingDefects.map(d => d.id).join(', ');
      return res.status(400).json({
        error: `Cannot delete integration '${integrationId}'. It is associated with open/active defect(s): [${defIds}]. Please resolve or reassign these defects first.`
      });
    }

    const deleted = await dataStore.remove('integrations', integrationId);
    res.json({ message: 'Integration deleted successfully', integration: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
