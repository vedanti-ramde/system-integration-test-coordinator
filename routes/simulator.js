const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// POST /api/simulator/ping - Simulate an API handshake ping for an integration
router.post('/ping', async (req, res, next) => {
  try {
    const { integrationId, saveAsTest, testedBy } = req.body;

    if (!integrationId) {
      return res.status(400).json({ error: 'Please select an integration to test.' });
    }

    const integration = await dataStore.getById('integrations', integrationId);
    if (!integration) {
      return res.status(404).json({ error: `Integration '${integrationId}' not found.` });
    }

    const services = await dataStore.readAll('services');
    const sourceService = services.find(s => s.id === integration.sourceServiceId);
    const targetService = services.find(s => s.id === integration.targetServiceId);

    const targetBaseUrl = targetService ? targetService.baseUrl : 'https://api.internal.corp/v1';
    const fullUrl = `${targetBaseUrl}${integration.endpoint}`;

    // Simulate realistic outcome based on integration status & method
    const status = (integration.status || '').toLowerCase();
    let isPass = true;
    let responseCode = 200;
    let responseTime = Math.floor(35 + Math.random() * 85); // 35ms - 120ms
    let remarks = '';
    let responsePayload = {};

    if (status === 'failed') {
      isPass = Math.random() < 0.2; // 80% fail rate
      if (!isPass) {
        responseCode = Math.random() > 0.5 ? 500 : 504;
        responseTime = responseCode === 504 ? Math.floor(2500 + Math.random() * 1000) : Math.floor(300 + Math.random() * 400);
        remarks = responseCode === 504
          ? 'Gateway timeout: downstream service failed to respond within 3000ms threshold.'
          : 'Internal Server Error: 500 returned during handshake verification.';
        responsePayload = {
          error: responseCode === 504 ? 'Gateway Timeout' : 'InternalServerError',
          status: responseCode,
          timestamp: new Date().toISOString(),
          path: integration.endpoint,
          traceId: `trc-${Math.random().toString(36).substring(2, 9)}`
        };
      } else {
        responseCode = 200;
        remarks = 'Handshake unexpectedly succeeded on retry.';
        responsePayload = { status: 'acknowledged', uptime: '99.8%', activeWorkers: 4 };
      }
    } else if (status === 'warning') {
      isPass = Math.random() < 0.75;
      responseTime = Math.floor(250 + Math.random() * 500); // 250ms - 750ms
      if (isPass) {
        responseCode = 200;
        remarks = `Handshake succeeded with elevated latency (${responseTime}ms). Near SLA boundary.`;
        responsePayload = {
          status: 'ok',
          latencyWarning: true,
          queueDepth: 42,
          executionTimeMs: responseTime
        };
      } else {
        responseCode = 504;
        responseTime = 3100;
        remarks = 'Handshake failed: SLA timeout breached (3100ms).';
        responsePayload = { error: 'Request Timeout', status: 504 };
      }
    } else if (status === 'not tested') {
      isPass = Math.random() < 0.85;
      responseCode = isPass ? (integration.httpMethod === 'POST' ? 201 : 200) : 401;
      responseTime = Math.floor(60 + Math.random() * 140);
      remarks = isPass
        ? `Initial handshake verified successfully. Handshake ping established.`
        : `Authentication challenge failed: OAuth/Key handshake rejected.`;
      responsePayload = isPass
        ? { handshake: 'ESTABLISHED', protocol: 'HTTP/1.1', ready: true }
        : { error: 'Unauthorized', message: 'Token or API key missing valid scope.' };
    } else {
      // Healthy
      isPass = Math.random() < 0.96;
      if (isPass) {
        responseCode = integration.httpMethod === 'POST' ? 201 : 200;
        responseTime = Math.floor(30 + Math.random() * 70);
        remarks = `HTTP handshake passed cleanly. Target service responded in ${responseTime}ms.`;
        responsePayload = {
          status: 'success',
          endpoint: integration.endpoint,
          service: integration.targetServiceName,
          authenticated: true,
          latencyMs: responseTime,
          timestamp: new Date().toISOString()
        };
      } else {
        responseCode = 503;
        responseTime = 180;
        remarks = 'Transient service unavailable (Service Mesh health check glitch).';
        responsePayload = { error: 'Service Unavailable', retryAfterSeconds: 5 };
      }
    }

    const testResult = isPass ? 'PASS' : 'FAIL';
    const timestamp = new Date().toISOString();

    // Prepare simulation record
    const simulationData = {
      integrationId: integration.id,
      integrationSummary: `${integration.sourceServiceName} → ${integration.targetServiceName}`,
      requestSent: {
        method: integration.httpMethod,
        url: fullUrl,
        headers: {
          'Host': new URL(targetBaseUrl).host,
          'Authorization': integration.authType === 'Bearer Token' ? 'Bearer eyJhbGciOiJIUzI1Ni...' : (integration.authType === 'API Key' ? 'ApiKey sk_live_89f...' : (integration.authType === 'OAuth 2.0' ? 'Bearer oauth_tk_...' : 'None')),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-SIT-Handshake-Id': `sim-${Date.now()}`
        }
      },
      responseCode,
      responseTime,
      result: testResult,
      timestamp,
      remarks,
      responsePayload
    };

    // If requested, optionally persist as a test record in tests.json
    let savedTestRecord = null;
    if (saveAsTest) {
      const tests = await dataStore.readAll('tests');
      const maxNum = tests.reduce((max, t) => {
        const match = t.id.match(/^TEST-(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const testId = `TEST-${String(maxNum + 1).padStart(3, '0')}`;

      savedTestRecord = {
        id: testId,
        integrationId: integration.id,
        sourceServiceId: integration.sourceServiceId,
        sourceServiceName: integration.sourceServiceName,
        targetServiceId: integration.targetServiceId,
        targetServiceName: integration.targetServiceName,
        endpoint: integration.endpoint,
        httpMethod: integration.httpMethod,
        requestStatus: isPass ? 'Completed' : 'Failed',
        responseCode,
        responseTime,
        testResult,
        testedBy: testedBy && testedBy.trim() ? testedBy.trim() : 'SIT Handshake Simulator',
        testDate: new Date().toISOString().slice(0, 10),
        remarks: `[Simulated Handshake] ${remarks}`
      };

      await dataStore.create('tests', savedTestRecord);
      simulationData.savedTestId = testId;
    }

    res.json(simulationData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
