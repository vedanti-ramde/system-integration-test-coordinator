const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// GET /api/services - List all services
router.get('/', async (req, res, next) => {
  try {
    const services = await dataStore.readAll('services');
    res.json(services);
  } catch (err) {
    next(err);
  }
});

// GET /api/services/:id - Get service by ID
router.get('/:id', async (req, res, next) => {
  try {
    const service = await dataStore.getById('services', req.params.id);
    if (!service) {
      return res.status(404).json({ error: `Service with ID '${req.params.id}' not found.` });
    }
    res.json(service);
  } catch (err) {
    next(err);
  }
});

// POST /api/services - Add a new service
router.post('/', async (req, res, next) => {
  try {
    const { id, name, type, owner, baseUrl, environment, status, description } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Service name is required.' });
    }
    if (!type || !type.trim()) {
      return res.status(400).json({ error: 'Service type is required.' });
    }
    if (!owner || !owner.trim()) {
      return res.status(400).json({ error: 'Service owner/team is required.' });
    }
    if (!baseUrl || !baseUrl.trim()) {
      return res.status(400).json({ error: 'Base URL is required.' });
    }

    const validStatuses = ['Active', 'Inactive', 'Maintenance'];
    const serviceStatus = validStatuses.includes(status) ? status : 'Active';

    // Auto-generate ID if not provided
    let serviceId = id && id.trim() ? id.trim() : null;
    if (!serviceId) {
      const cleanPrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'SRV';
      const randomSuffix = Math.floor(10 + Math.random() * 90);
      serviceId = `SRV-${cleanPrefix}-${randomSuffix}`;
    }

    const newService = {
      id: serviceId,
      name: name.trim(),
      type: type.trim(),
      owner: owner.trim(),
      baseUrl: baseUrl.trim(),
      environment: environment && environment.trim() ? environment.trim() : 'QA',
      status: serviceStatus,
      description: description ? description.trim() : ''
    };

    const created = await dataStore.create('services', newService);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/services/:id - Update an existing service
router.put('/:id', async (req, res, next) => {
  try {
    const { name, type, owner, baseUrl, environment, status, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Service name is required.' });
    }
    if (!type || !type.trim()) {
      return res.status(400).json({ error: 'Service type is required.' });
    }
    if (!owner || !owner.trim()) {
      return res.status(400).json({ error: 'Service owner/team is required.' });
    }
    if (!baseUrl || !baseUrl.trim()) {
      return res.status(400).json({ error: 'Base URL is required.' });
    }

    const validStatuses = ['Active', 'Inactive', 'Maintenance'];
    const serviceStatus = validStatuses.includes(status) ? status : 'Active';

    const updated = await dataStore.update('services', req.params.id, {
      name: name.trim(),
      type: type.trim(),
      owner: owner.trim(),
      baseUrl: baseUrl.trim(),
      environment: environment && environment.trim() ? environment.trim() : 'QA',
      status: serviceStatus,
      description: description ? description.trim() : ''
    });

    // Also update any denormalized service names in integrations and tests
    try {
      const integrations = await dataStore.readAll('integrations');
      let intUpdated = false;
      for (const int of integrations) {
        if (int.sourceServiceId === updated.id && int.sourceServiceName !== updated.name) {
          int.sourceServiceName = updated.name;
          intUpdated = true;
        }
        if (int.targetServiceId === updated.id && int.targetServiceName !== updated.name) {
          int.targetServiceName = updated.name;
          intUpdated = true;
        }
      }
      if (intUpdated) {
        await dataStore.writeAll('integrations', integrations);
      }
    } catch (e) {
      console.error('Non-critical sync error:', e);
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/services/:id - Delete a service
router.delete('/:id', async (req, res, next) => {
  try {
    const serviceId = req.params.id;

    // Check referential integrity: is service used in integrations?
    const integrations = await dataStore.readAll('integrations');
    const referencingIntegrations = integrations.filter(
      int => int.sourceServiceId === serviceId || int.targetServiceId === serviceId
    );

    if (referencingIntegrations.length > 0) {
      const intIds = referencingIntegrations.map(i => i.id).join(', ');
      return res.status(400).json({
        error: `Cannot delete service '${serviceId}'. It is currently mapped in ${referencingIntegrations.length} integration(s): [${intIds}]. Please reassign or delete these integrations first.`
      });
    }

    const deleted = await dataStore.remove('services', serviceId);
    res.json({ message: 'Service deleted successfully', service: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
