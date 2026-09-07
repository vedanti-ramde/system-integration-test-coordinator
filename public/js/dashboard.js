/**
 * Dashboard & Live Simulator Logic
 */

let testChartInstance = null;
let defectChartInstance = null;
let cachedIntegrations = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadDashboardData();
  await setupSimulator();

  const refreshBtn = document.getElementById('refreshDashboardBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Refreshing...`;
      await loadDashboardData();
      showToast('Dashboard metrics refreshed successfully.');
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = `<i class="bi bi-arrow-clockwise"></i> Refresh`;
    });
  }
});

async function loadDashboardData() {
  try {
    const data = await fetchApi('/api/dashboard');
    if (!data) return;

    // Update 8 Metric Cards
    document.getElementById('cardTotalServices').textContent = data.totalServices ?? 0;
    document.getElementById('cardTotalIntegrations').textContent = data.totalIntegrations ?? 0;
    document.getElementById('cardTotalTests').textContent = data.totalTests ?? 0;
    document.getElementById('cardPassRate').textContent = `${data.passRate ?? 0}%`;

    const passBar = document.getElementById('passRateBar');
    if (passBar) {
      passBar.style.width = `${Math.min(data.passRate ?? 0, 100)}%`;
      if (data.passRate < 50) {
        passBar.className = 'progress-bar bg-danger';
      } else if (data.passRate < 80) {
        passBar.className = 'progress-bar bg-warning';
      } else {
        passBar.className = 'progress-bar bg-success';
      }
    }

    document.getElementById('cardPassedTests').textContent = data.passedTests ?? 0;
    document.getElementById('cardFailedTests').textContent = data.failedTests ?? 0;
    document.getElementById('cardOpenDefects').textContent = data.openDefects ?? 0;
    document.getElementById('cardTotalDefects').textContent = data.totalDefects ?? 0;
    document.getElementById('cardCriticalDefects').textContent = data.criticalDefects ?? 0;

    // Render Charts
    renderTestChart(data);
    renderDefectChart(data);

    // Render Recent Tables
    renderRecentTests(data.recentTests || []);
    renderRecentDefects(data.recentDefects || []);

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
    showToast(`Error loading dashboard: ${err.message}`, 'danger');
  }
}

function renderTestChart(data) {
  const canvas = document.getElementById('testResultsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const chartData = {
    labels: ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN'],
    datasets: [{
      data: [
        data.passedTests || 0,
        data.failedTests || 0,
        data.blockedTests || 0,
        data.notRunTests || 0
      ],
      backgroundColor: [
        '#10b981', // green
        '#ef4444', // red
        '#f59e0b', // orange
        '#94a3b8'  // gray
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  if (testChartInstance) {
    testChartInstance.data = chartData;
    testChartInstance.update();
  } else {
    testChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { font: { size: 12, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${context.raw} tests`
            }
          }
        },
        cutout: '65%'
      }
    });
  }
}

function renderDefectChart(data) {
  const canvas = document.getElementById('defectSeverityChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const chartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{
      label: 'Defects by Severity',
      data: [
        data.criticalDefects || 0,
        data.highDefects || 0,
        data.mediumDefects || 0,
        data.lowDefects || 0
      ],
      backgroundColor: [
        '#7f1d1d', // critical dark red
        '#ef4444', // high red
        '#f59e0b', // medium amber
        '#3b82f6'  // low blue
      ],
      borderRadius: 6
    }]
  };

  if (defectChartInstance) {
    defectChartInstance.data = chartData;
    defectChartInstance.update();
  } else {
    defectChartInstance = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }
}

function renderRecentTests(tests) {
  const tbody = document.getElementById('recentTestsTableBody');
  if (!tbody) return;

  if (tests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No handshake tests recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = tests.map(test => `
    <tr>
      <td><span class="font-monospace fw-bold text-primary">${escapeHtml(test.id)}</span></td>
      <td>
        <div class="fw-semibold small">${escapeHtml(test.sourceServiceName)} <i class="bi bi-arrow-right text-muted"></i> ${escapeHtml(test.targetServiceName)}</div>
        <div class="text-muted font-monospace" style="font-size: 0.72rem;">${renderMethodBadge(test.httpMethod)} ${escapeHtml(test.endpoint)}</div>
      </td>
      <td>${renderResultBadge(test.testResult)}</td>
      <td><span class="badge ${test.responseCode >= 200 && test.responseCode < 300 ? 'bg-success-subtle text-success' : (test.responseCode === 0 ? 'bg-secondary-subtle text-secondary' : 'bg-danger-subtle text-danger')} font-monospace">${test.responseCode || '—'}</span></td>
      <td class="font-monospace small">${test.responseTime ? `${test.responseTime}ms` : '—'}</td>
    </tr>
  `).join('');
}

function renderRecentDefects(defects) {
  const tbody = document.getElementById('recentDefectsTableBody');
  if (!tbody) return;

  if (defects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No defects currently logged.</td></tr>`;
    return;
  }

  tbody.innerHTML = defects.map(defect => `
    <tr>
      <td><span class="font-monospace fw-bold text-danger">${escapeHtml(defect.id)}</span></td>
      <td>
        <div class="fw-semibold small text-truncate" style="max-width: 200px;" title="${escapeHtml(defect.title)}">${escapeHtml(defect.title)}</div>
        <div class="text-muted" style="font-size: 0.72rem;">${formatDate(defect.createdDate)}</div>
      </td>
      <td>${renderSeverityBadge(defect.severity)}</td>
      <td>${renderPriorityBadge(defect.priority)}</td>
      <td>${renderStatusBadge(defect.status)}</td>
    </tr>
  `).join('');
}

// Live Handshake Simulator Implementation
async function setupSimulator() {
  const select = document.getElementById('simIntegrationSelect');
  const detailsBox = document.getElementById('simIntegrationDetails');
  const runBtn = document.getElementById('runPingBtn');
  if (!select) return;

  try {
    cachedIntegrations = await fetchApi('/api/integrations');
    select.innerHTML = `<option value="" disabled selected>-- Choose an integration endpoint --</option>`;

    cachedIntegrations.forEach(int => {
      const opt = document.createElement('option');
      opt.value = int.id;
      opt.textContent = `[${int.id}] ${int.sourceServiceName} → ${int.targetServiceName} (${int.httpMethod} ${int.endpoint})`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      const selected = cachedIntegrations.find(i => i.id === select.value);
      if (selected) {
        detailsBox.classList.remove('d-none');
        document.getElementById('simDetailMethod').innerHTML = renderMethodBadge(selected.httpMethod);
        document.getElementById('simDetailEndpoint').textContent = selected.endpoint;
        document.getElementById('simDetailSource').textContent = selected.sourceServiceName;
        document.getElementById('simDetailTarget').textContent = selected.targetServiceName;
        document.getElementById('simDetailAuth').textContent = selected.authType;
        document.getElementById('simDetailStatus').innerHTML = renderStatusBadge(selected.status);
        runBtn.disabled = false;
      }
    });

    runBtn.addEventListener('click', async () => {
      const integrationId = select.value;
      if (!integrationId) return;

      const autoSave = document.getElementById('simAutoSaveCheck').checked;
      runBtn.disabled = true;
      runBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Pinging Handshake...`;

      const resultBox = document.getElementById('simulatorResultBox');
      resultBox.classList.add('d-none');

      try {
        const simResult = await fetchApi('/api/simulator/ping', {
          method: 'POST',
          body: {
            integrationId,
            saveAsTest: autoSave,
            testedBy: 'Dashboard Simulator'
          }
        });

        // Display results
        resultBox.classList.remove('d-none');
        document.getElementById('simOutUrl').textContent = `${simResult.requestSent.method} ${simResult.requestSent.url}`;
        
        const codeEl = document.getElementById('simOutCode');
        codeEl.innerHTML = `<span class="badge ${simResult.responseCode >= 200 && simResult.responseCode < 300 ? 'bg-success' : 'bg-danger'}">${simResult.responseCode}</span>`;
        
        document.getElementById('simOutLatency').textContent = `${simResult.responseTime} ms`;
        document.getElementById('simOutResult').innerHTML = renderResultBadge(simResult.result);
        document.getElementById('simOutTime').textContent = new Date(simResult.timestamp).toLocaleTimeString();
        document.getElementById('simOutRemarks').textContent = simResult.remarks;
        document.getElementById('simOutPayload').textContent = JSON.stringify(simResult.responsePayload, null, 2);

        // Saved alert
        const savedAlert = document.getElementById('simSavedAlert');
        if (simResult.savedTestId) {
          savedAlert.textContent = `✓ Saved as ${simResult.savedTestId}`;
          savedAlert.classList.remove('d-none');
          showToast(`Handshake ping completed (${simResult.result}) and logged as ${simResult.savedTestId}`);
          // Refresh dashboard data so metrics and recent tests update in real time
          await loadDashboardData();
        } else {
          savedAlert.classList.add('d-none');
          showToast(`Handshake simulation completed: ${simResult.result}`);
        }

      } catch (err) {
        showToast(`Simulation failed: ${err.message}`, 'danger');
      } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = `<i class="bi bi-play-circle-fill"></i> Run Handshake Ping`;
      }
    });

  } catch (err) {
    console.error('Failed to initialize simulator:', err);
  }
}
