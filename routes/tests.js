const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// GET /api/tests - List all test records
router.get('/', async (req, res, next) => {
  try {
    const tests = await dataStore.readAll('tests');
    res.json(tests);
  } catch (err) {
    next(err);
  }
});

// GET /api/tests/:id - Get test by ID
router.get('/:id', async (req, res, next) => {
  try {
    const test = await dataStore.getById('tests', req.params.id);
    if (!test) {
      return res.status(404).json({ error: `Test record with ID '${req.params.id}' not found.` });
    }
    res.json(test);
  } catch (err) {
    next(err);
  }
});

// POST /api/tests - Create a new test record
router.post('/', async (req, res, next) => {
  try {
    const {
      id,
      integrationId,
      sourceServiceId,
      sourceServiceName,
      targetServiceId,
      targetServiceName,
      endpoint,
      httpMethod,
      requestStatus,
      responseCode,
      responseTime,
      testResult,
      testedBy,
      testDate,
      remarks
    } = req.body;

    // Validate result
    const validResults = ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'];
    if (!testResult || !validResults.includes(testResult.toUpperCase())) {
      return res.status(400).json({ error: 'Valid test result is required (PASS, FAIL, BLOCKED, NOT RUN).' });
    }

    if (!testedBy || !testedBy.trim()) {
      return res.status(400).json({ error: 'Tester name/identifier is required.' });
    }

    // Resolve integration details if integrationId is provided
    let intRef = null;
    if (integrationId) {
      intRef = await dataStore.getById('integrations', integrationId);
    }

    // Auto-generate test ID if omitted
    let testId = id && id.trim() ? id.trim() : null;
    if (!testId) {
      const tests = await dataStore.readAll('tests');
      const maxNum = tests.reduce((max, t) => {
        const match = t.id.match(/^TEST-(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      testId = `TEST-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const newTest = {
      id: testId,
      integrationId: intRef ? intRef.id : (integrationId || 'N/A'),
      sourceServiceId: intRef ? intRef.sourceServiceId : (sourceServiceId || 'N/A'),
      sourceServiceName: intRef ? intRef.sourceServiceName : (sourceServiceName || 'Unknown Source'),
      targetServiceId: intRef ? intRef.targetServiceId : (targetServiceId || 'N/A'),
      targetServiceName: intRef ? intRef.targetServiceName : (targetServiceName || 'Unknown Target'),
      endpoint: intRef ? intRef.endpoint : (endpoint || '/api'),
      httpMethod: intRef ? intRef.httpMethod : (httpMethod || 'GET'),
      requestStatus: requestStatus || (testResult.toUpperCase() === 'PASS' ? 'Completed' : 'Failed'),
      responseCode: Number.isInteger(Number(responseCode)) ? Number(responseCode) : (testResult.toUpperCase() === 'PASS' ? 200 : 500),
      responseTime: !isNaN(Number(responseTime)) ? Number(responseTime) : 50,
      testResult: testResult.toUpperCase(),
      testedBy: testedBy.trim(),
      testDate: testDate ? testDate.trim() : new Date().toISOString().slice(0, 10),
      remarks: remarks ? remarks.trim() : ''
    };

    const created = await dataStore.create('tests', newTest);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tests/:id - Update test record
router.put('/:id', async (req, res, next) => {
  try {
    const {
      integrationId,
      endpoint,
      httpMethod,
      requestStatus,
      responseCode,
      responseTime,
      testResult,
      testedBy,
      testDate,
      remarks
    } = req.body;

    const validResults = ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'];
    if (testResult && !validResults.includes(testResult.toUpperCase())) {
      return res.status(400).json({ error: 'Valid test result is required (PASS, FAIL, BLOCKED, NOT RUN).' });
    }

    let updates = { ...req.body };
    if (testResult) updates.testResult = testResult.toUpperCase();
    if (responseCode !== undefined) updates.responseCode = Number(responseCode);
    if (responseTime !== undefined) updates.responseTime = Number(responseTime);

    // If integrationId updated, refresh service names
    if (integrationId) {
      const intRef = await dataStore.getById('integrations', integrationId);
      if (intRef) {
        updates.integrationId = intRef.id;
        updates.sourceServiceId = intRef.sourceServiceId;
        updates.sourceServiceName = intRef.sourceServiceName;
        updates.targetServiceId = intRef.targetServiceId;
        updates.targetServiceName = intRef.targetServiceName;
        updates.endpoint = intRef.endpoint;
        updates.httpMethod = intRef.httpMethod;
      }
    }

    const updated = await dataStore.update('tests', req.params.id, updates);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tests/:id - Delete test record
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await dataStore.remove('tests', req.params.id);
    res.json({ message: 'Test record deleted successfully', test: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
