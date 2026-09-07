const express = require('express');
const router = express.Router();
const dataStore = require('../utils/dataStore');

// GET /api/dashboard - Dynamically calculate all dashboard metrics
router.get('/', async (req, res, next) => {
  try {
    const services = await dataStore.readAll('services');
    const integrations = await dataStore.readAll('integrations');
    const tests = await dataStore.readAll('tests');
    const defects = await dataStore.readAll('defects');

    // Test stats
    const passedTests = tests.filter(t => (t.testResult || '').toUpperCase() === 'PASS').length;
    const failedTests = tests.filter(t => (t.testResult || '').toUpperCase() === 'FAIL').length;
    const blockedTests = tests.filter(t => (t.testResult || '').toUpperCase() === 'BLOCKED').length;
    const notRunTests = tests.filter(t => (t.testResult || '').toUpperCase() === 'NOT RUN').length;

    // Completed tests for pass rate calculation (PASS + FAIL + BLOCKED)
    const completedTests = passedTests + failedTests + blockedTests;
    const passRate = completedTests > 0 ? Number(((passedTests / completedTests) * 100).toFixed(1)) : 0;

    // Defect stats
    const openDefects = defects.filter(d => (d.status || '').toLowerCase() === 'open').length;
    const inProgressDefects = defects.filter(d => (d.status || '').toLowerCase() === 'in progress').length;
    const resolvedDefects = defects.filter(d => (d.status || '').toLowerCase() === 'resolved').length;
    const closedDefects = defects.filter(d => (d.status || '').toLowerCase() === 'closed').length;

    const criticalDefects = defects.filter(d => (d.severity || '').toLowerCase() === 'critical').length;
    const highDefects = defects.filter(d => (d.severity || '').toLowerCase() === 'high').length;
    const mediumDefects = defects.filter(d => (d.severity || '').toLowerCase() === 'medium').length;
    const lowDefects = defects.filter(d => (d.severity || '').toLowerCase() === 'low').length;

    // Integration health
    const healthyIntegrations = integrations.filter(i => (i.status || '').toLowerCase() === 'healthy').length;
    const warningIntegrations = integrations.filter(i => (i.status || '').toLowerCase() === 'warning').length;
    const failedIntegrations = integrations.filter(i => (i.status || '').toLowerCase() === 'failed').length;
    const notTestedIntegrations = integrations.filter(i => (i.status || '').toLowerCase() === 'not tested').length;

    // Service status
    const activeServices = services.filter(s => (s.status || '').toLowerCase() === 'active').length;
    const inactiveServices = services.filter(s => (s.status || '').toLowerCase() === 'inactive').length;
    const maintenanceServices = services.filter(s => (s.status || '').toLowerCase() === 'maintenance').length;

    // Recent items (shallow copy and reverse)
    const recentTests = [...tests].reverse().slice(0, 5);
    const recentDefects = [...defects].reverse().slice(0, 5);

    res.json({
      totalServices: services.length,
      totalIntegrations: integrations.length,
      totalTests: tests.length,
      passedTests,
      failedTests,
      blockedTests,
      notRunTests,
      completedTests,
      passRate,
      openDefects,
      inProgressDefects,
      resolvedDefects,
      closedDefects,
      totalDefects: defects.length,
      criticalDefects,
      highDefects,
      mediumDefects,
      lowDefects,
      integrationHealth: {
        healthy: healthyIntegrations,
        warning: warningIntegrations,
        failed: failedIntegrations,
        notTested: notTestedIntegrations
      },
      serviceStatus: {
        active: activeServices,
        inactive: inactiveServices,
        maintenance: maintenanceServices
      },
      recentTests,
      recentDefects
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
