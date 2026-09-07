/**
 * Comprehensive Automated Test Suite for SIT Coordinator
 */

const http = require('http');
const app = require('./server');

const PORT = 3001; // use separate test port to avoid collision
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log(' Starting SIT Coordinator Automated Verification Suite');
  console.log('======================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failedCount++;
    }
  }

  try {
    // 1. Health Check Endpoint
    console.log('\n--- 1. Health Check Endpoint ---');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returned HTTP 200');
    assert(healthRes.body.status === 'ok', 'Health status is "ok"');
    assert(healthRes.body.message === 'SIT Coordinator API is running', 'Health message matches');

    // 2. Dashboard Dynamic Calculation Endpoint
    console.log('\n--- 2. Dashboard Metrics API ---');
    const dashRes = await request('GET', '/api/dashboard');
    assert(dashRes.status === 200, 'GET /api/dashboard returned HTTP 200');
    assert(typeof dashRes.body.totalServices === 'number' && dashRes.body.totalServices >= 6, `totalServices >= 6 (got ${dashRes.body.totalServices})`);
    assert(typeof dashRes.body.totalIntegrations === 'number' && dashRes.body.totalIntegrations >= 8, `totalIntegrations >= 8 (got ${dashRes.body.totalIntegrations})`);
    assert(typeof dashRes.body.totalTests === 'number' && dashRes.body.totalTests >= 12, `totalTests >= 12 (got ${dashRes.body.totalTests})`);
    assert(typeof dashRes.body.passedTests === 'number', `passedTests is numeric (${dashRes.body.passedTests})`);
    assert(typeof dashRes.body.failedTests === 'number', `failedTests is numeric (${dashRes.body.failedTests})`);
    assert(typeof dashRes.body.openDefects === 'number', `openDefects is numeric (${dashRes.body.openDefects})`);
    assert(typeof dashRes.body.criticalDefects === 'number', `criticalDefects is numeric (${dashRes.body.criticalDefects})`);
    assert(typeof dashRes.body.passRate === 'number', `passRate is calculated (${dashRes.body.passRate}%)`);
    assert(Array.isArray(dashRes.body.recentTests), 'recentTests is an array');
    assert(Array.isArray(dashRes.body.recentDefects), 'recentDefects is an array');

    // 3. Services CRUD API
    console.log('\n--- 3. Services CRUD Operations ---');
    const getServicesRes = await request('GET', '/api/services');
    assert(getServicesRes.status === 200 && Array.isArray(getServicesRes.body), 'GET /api/services returned list');

    // Create Temporary Service
    const tempServiceId = `SRV-TEST-${Date.now().toString().slice(-4)}`;
    const createServiceRes = await request('POST', '/api/services', {
      id: tempServiceId,
      name: 'Automated Test Service',
      type: 'Microservice',
      owner: 'QA Automation',
      baseUrl: 'https://test-service.internal.corp/api/v1',
      environment: 'QA',
      status: 'Active',
      description: 'Temporary service created by automated test suite'
    });
    assert(createServiceRes.status === 201, `POST /api/services created service (${createServiceRes.status})`);
    assert(createServiceRes.body.id === tempServiceId, 'Created service has expected ID');

    // Update Temporary Service
    const updateServiceRes = await request('PUT', `/api/services/${tempServiceId}`, {
      name: 'Automated Test Service (Updated)',
      type: 'Microservice',
      owner: 'QA Automation Lead',
      baseUrl: 'https://test-service.internal.corp/api/v1',
      environment: 'QA',
      status: 'Maintenance',
      description: 'Updated description'
    });
    assert(updateServiceRes.status === 200, `PUT /api/services/${tempServiceId} updated service`);
    assert(updateServiceRes.body.status === 'Maintenance', 'Updated service has status Maintenance');

    // Delete Temporary Service
    const deleteServiceRes = await request('DELETE', `/api/services/${tempServiceId}`);
    assert(deleteServiceRes.status === 200, `DELETE /api/services/${tempServiceId} succeeded`);

    // Test referential integrity: attempt to delete active service used in integrations
    const delBlockedRes = await request('DELETE', '/api/services/SRV-AUTH-01');
    assert(delBlockedRes.status === 400, 'DELETE service referenced by integrations correctly returned HTTP 400');

    // 4. Integrations CRUD API
    console.log('\n--- 4. Integrations CRUD Operations ---');
    const getIntRes = await request('GET', '/api/integrations');
    assert(getIntRes.status === 200 && Array.isArray(getIntRes.body), 'GET /api/integrations returned list');

    // Create Temporary Integration
    const tempIntId = `INT-TEST-${Date.now().toString().slice(-4)}`;
    const createIntRes = await request('POST', '/api/integrations', {
      id: tempIntId,
      sourceServiceId: 'SRV-AUTH-01',
      targetServiceId: 'SRV-USER-02',
      endpoint: '/test/handshake',
      httpMethod: 'POST',
      authType: 'Bearer Token',
      environment: 'QA',
      status: 'Healthy',
      description: 'Temporary integration test'
    });
    assert(createIntRes.status === 201, `POST /api/integrations created integration (${createIntRes.status})`);
    assert(createIntRes.body.id === tempIntId, 'Created integration has correct ID');

    // Update Temporary Integration
    const updateIntRes = await request('PUT', `/api/integrations/${tempIntId}`, {
      sourceServiceId: 'SRV-AUTH-01',
      targetServiceId: 'SRV-USER-02',
      endpoint: '/test/handshake-updated',
      httpMethod: 'GET',
      authType: 'API Key',
      environment: 'QA',
      status: 'Warning',
      description: 'Updated contract'
    });
    assert(updateIntRes.status === 200, `PUT /api/integrations/${tempIntId} updated integration`);
    assert(updateIntRes.body.status === 'Warning', 'Updated status is Warning');

    // Delete Temporary Integration
    const deleteIntRes = await request('DELETE', `/api/integrations/${tempIntId}`);
    assert(deleteIntRes.status === 200, `DELETE /api/integrations/${tempIntId} succeeded`);

    // Invalid Integration validation (same source and target)
    const invalidIntRes = await request('POST', '/api/integrations', {
      sourceServiceId: 'SRV-AUTH-01',
      targetServiceId: 'SRV-AUTH-01',
      endpoint: '/self',
      httpMethod: 'GET'
    });
    assert(invalidIntRes.status === 400, 'Same source & target correctly rejected with HTTP 400');

    // 5. Handshake Tests CRUD API
    console.log('\n--- 5. Handshake Tests CRUD Operations ---');
    const getTestsRes = await request('GET', '/api/tests');
    assert(getTestsRes.status === 200 && Array.isArray(getTestsRes.body), 'GET /api/tests returned list');

    // Create Temporary Test
    const tempTestId = `TEST-TEST-${Date.now().toString().slice(-4)}`;
    const createTestRes = await request('POST', '/api/tests', {
      id: tempTestId,
      integrationId: 'INT-001',
      endpoint: '/users/verify-token',
      httpMethod: 'POST',
      requestStatus: 'Completed',
      responseCode: 200,
      responseTime: 40,
      testResult: 'PASS',
      testedBy: 'Automated Runner',
      testDate: '2026-09-07',
      remarks: 'Automated test suite sample log'
    });
    assert(createTestRes.status === 201, `POST /api/tests created test record (${createTestRes.status})`);
    assert(createTestRes.body.id === tempTestId, 'Created test has correct ID');

    // Update Test
    const updateTestRes = await request('PUT', `/api/tests/${tempTestId}`, {
      testResult: 'FAIL',
      responseCode: 500,
      remarks: 'Updated to fail for verification'
    });
    assert(updateTestRes.status === 200, `PUT /api/tests/${tempTestId} updated test`);
    assert(updateTestRes.body.testResult === 'FAIL', 'Test result correctly updated to FAIL');

    // Delete Test
    const deleteTestRes = await request('DELETE', `/api/tests/${tempTestId}`);
    assert(deleteTestRes.status === 200, `DELETE /api/tests/${tempTestId} deleted successfully`);

    // 6. Defects CRUD API
    console.log('\n--- 6. Defects CRUD Operations ---');
    const getDefectsRes = await request('GET', '/api/defects');
    assert(getDefectsRes.status === 200 && Array.isArray(getDefectsRes.body), 'GET /api/defects returned list');

    // Create Temporary Defect
    const tempDefId = `DEF-TEST-${Date.now().toString().slice(-4)}`;
    const createDefRes = await request('POST', '/api/defects', {
      id: tempDefId,
      title: 'Automated Verification Sample Defect',
      relatedIntegrationId: 'INT-001',
      severity: 'Medium',
      priority: 'P3',
      status: 'Open',
      assignedTo: 'QA Team',
      reportedBy: 'Test Bot',
      description: 'Created during test run',
      expectedResult: 'HTTP 200',
      actualResult: 'HTTP 500'
    });
    assert(createDefRes.status === 201, `POST /api/defects created defect (${createDefRes.status})`);
    assert(createDefRes.body.id === tempDefId, 'Created defect has correct ID');

    // Update Defect
    const updateDefRes = await request('PUT', `/api/defects/${tempDefId}`, {
      title: 'Automated Verification Sample Defect (Fixed)',
      status: 'Resolved'
    });
    assert(updateDefRes.status === 200, `PUT /api/defects/${tempDefId} updated defect`);
    assert(updateDefRes.body.status === 'Resolved', 'Defect status updated to Resolved');

    // Delete Defect
    const deleteDefRes = await request('DELETE', `/api/defects/${tempDefId}`);
    assert(deleteDefRes.status === 200, `DELETE /api/defects/${tempDefId} deleted successfully`);

    // 7. Live Handshake Simulator
    console.log('\n--- 7. Live API Handshake Simulator ---');
    const simRes = await request('POST', '/api/simulator/ping', {
      integrationId: 'INT-001',
      saveAsTest: true,
      testedBy: 'Automated Ping Tester'
    });
    assert(simRes.status === 200, 'POST /api/simulator/ping returned HTTP 200');
    assert(simRes.body.result === 'PASS' || simRes.body.result === 'FAIL', `Simulator returned valid result (${simRes.body.result})`);
    assert(typeof simRes.body.responseTime === 'number', `Latency is a number (${simRes.body.responseTime}ms)`);
    assert(simRes.body.savedTestId, `Test record auto-persisted with ID: ${simRes.body.savedTestId}`);

    // Clean up the auto-saved simulation test
    if (simRes.body.savedTestId) {
      await request('DELETE', `/api/tests/${simRes.body.savedTestId}`);
    }

    // 8. Static Web Pages Serving
    console.log('\n--- 8. Static Frontend Pages Serving ---');
    const pages = ['/', '/services.html', '/integrations.html', '/tests.html', '/defects.html', '/css/style.css'];
    for (const page of pages) {
      const pageRes = await request('GET', page);
      assert(pageRes.status === 200, `GET ${page} returned HTTP 200`);
    }

  } catch (err) {
    console.error('Fatal test error:', err);
    failedCount++;
  } finally {
    console.log('\n======================================================');
    console.log(` Results: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('======================================================\n');

    if (server) {
      server.close();
    }
    process.exit(failedCount === 0 ? 0 : 1);
  }
}

server = app.listen(PORT, async () => {
  await runTests();
});
