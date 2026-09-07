/**
 * Handshake Tests Page Logic
 */

let tests = [];
let integrations = [];
let services = [];
let editingTestId = null;
let testModal = null;
let viewModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  testModal = new bootstrap.Modal(document.getElementById('testModal'));
  viewModal = new bootstrap.Modal(document.getElementById('viewTestModal'));

  // Default test date to today
  document.getElementById('testDateInput').value = new Date().toISOString().slice(0, 10);

  await loadServicesAndIntegrations();
  await loadTests();

  // Search and Filter Listeners
  document.getElementById('testSearchInput').addEventListener('input', applyFilters);
  document.getElementById('testResultFilter').addEventListener('change', applyFilters);
  document.getElementById('testServiceFilter').addEventListener('change', applyFilters);
  document.getElementById('testDateFilter').addEventListener('change', applyFilters);
  document.getElementById('clearTestFiltersBtn').addEventListener('click', () => {
    document.getElementById('testSearchInput').value = '';
    document.getElementById('testResultFilter').value = '';
    document.getElementById('testServiceFilter').value = '';
    document.getElementById('testDateFilter').value = '';
    applyFilters();
  });

  // Open Add Test Modal
  document.getElementById('openAddTestModalBtn').addEventListener('click', () => {
    editingTestId = null;
    document.getElementById('testModalTitle').textContent = 'Record API Handshake Test';
    document.getElementById('testForm').reset();
    document.getElementById('testIdInput').disabled = false;
    document.getElementById('testDateInput').value = new Date().toISOString().slice(0, 10);
    document.getElementById('testResponseCodeInput').value = '200';
    document.getElementById('testResponseTimeInput').value = '45';
    document.getElementById('testResultSelect').value = 'PASS';
    document.getElementById('testRequestStatusSelect').value = 'Completed';
    testModal.show();
  });

  // Integration preset auto-fill
  document.getElementById('testIntegrationSelect').addEventListener('change', (e) => {
    const intId = e.target.value;
    const selected = integrations.find(i => i.id === intId);
    if (selected) {
      document.getElementById('testSourceInput').value = selected.sourceServiceName;
      document.getElementById('testTargetInput').value = selected.targetServiceName;
      document.getElementById('testEndpointInput').value = selected.endpoint;
      document.getElementById('testMethodSelect').value = selected.httpMethod;
    }
  });

  // Test Form Submit
  document.getElementById('testForm').addEventListener('submit', handleFormSubmit);
});

async function loadServicesAndIntegrations() {
  try {
    const [srvData, intData] = await Promise.all([
      fetchApi('/api/services'),
      fetchApi('/api/integrations')
    ]);
    services = srvData;
    integrations = intData;

    // Populate service filter dropdown
    const serviceFilter = document.getElementById('testServiceFilter');
    serviceFilter.innerHTML = `<option value="">All Services</option>`;
    services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      serviceFilter.appendChild(opt);
    });

    // Populate Integration preset selector in Add/Edit modal
    const intSelect = document.getElementById('testIntegrationSelect');
    intSelect.innerHTML = `<option value="">-- Manual Entry / Pick an Integration --</option>`;
    integrations.forEach(i => {
      const opt = document.createElement('option');
      opt.value = i.id;
      opt.textContent = `[${i.id}] ${i.sourceServiceName} → ${i.targetServiceName} (${i.httpMethod} ${i.endpoint})`;
      intSelect.appendChild(opt);
    });

  } catch (err) {
    console.error('Failed to preload services/integrations for tests:', err);
  }
}

async function loadTests() {
  try {
    tests = await fetchApi('/api/tests');
    applyFilters();
  } catch (err) {
    showToast(`Error loading tests: ${err.message}`, 'danger');
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById('testSearchInput').value || '').toLowerCase();
  const resultFilter = document.getElementById('testResultFilter').value;
  const serviceFilter = document.getElementById('testServiceFilter').value;
  const dateFilter = document.getElementById('testDateFilter').value;

  const filtered = tests.filter(test => {
    const matchesSearch =
      (test.id || '').toLowerCase().includes(searchTerm) ||
      (test.endpoint || '').toLowerCase().includes(searchTerm) ||
      (test.testedBy || '').toLowerCase().includes(searchTerm) ||
      (test.remarks || '').toLowerCase().includes(searchTerm) ||
      (test.sourceServiceName || '').toLowerCase().includes(searchTerm) ||
      (test.targetServiceName || '').toLowerCase().includes(searchTerm);

    const matchesResult = !resultFilter || test.testResult === resultFilter;
    const matchesDate = !dateFilter || test.testDate === dateFilter;

    let matchesService = true;
    if (serviceFilter) {
      matchesService = test.sourceServiceId === serviceFilter ||
                       test.targetServiceId === serviceFilter ||
                       test.sourceServiceName === serviceFilter ||
                       test.targetServiceName === serviceFilter;
    }

    return matchesSearch && matchesResult && matchesDate && matchesService;
  });

  renderTable(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById('testsTableBody');
  document.getElementById('testCount').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No test records match your filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(test => `
    <tr>
      <td><span class="font-monospace fw-bold text-primary">${escapeHtml(test.id)}</span></td>
      <td>
        <div class="fw-semibold small">${escapeHtml(test.sourceServiceName)}</div>
        <div class="text-muted font-monospace" style="font-size: 0.72rem;">${escapeHtml(test.sourceServiceId)}</div>
      </td>
      <td>
        <div class="fw-semibold small">${escapeHtml(test.targetServiceName)}</div>
        <div class="text-muted font-monospace" style="font-size: 0.72rem;">${escapeHtml(test.targetServiceId)}</div>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          ${renderMethodBadge(test.httpMethod)}
          <span class="font-monospace small text-primary text-truncate" style="max-width: 160px;" title="${escapeHtml(test.endpoint)}">${escapeHtml(test.endpoint)}</span>
        </div>
      </td>
      <td>
        <span class="badge ${test.responseCode >= 200 && test.responseCode < 300 ? 'bg-success-subtle text-success' : (test.responseCode === 0 ? 'bg-secondary-subtle text-secondary' : 'bg-danger-subtle text-danger')} font-monospace">
          ${test.responseCode || '0'}
        </span>
      </td>
      <td class="font-monospace small">${test.responseTime ? `${test.responseTime}ms` : '0ms'}</td>
      <td>${renderResultBadge(test.testResult)}</td>
      <td class="small text-muted">${escapeHtml(test.testedBy)}</td>
      <td class="small text-muted font-monospace">${formatDate(test.testDate)}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-action" onclick="viewTest('${escapeHtml(test.id)}')" title="View Report">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-outline-primary btn-action" onclick="editTest('${escapeHtml(test.id)}')" title="Edit Record">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-action" onclick="deleteTest('${escapeHtml(test.id)}')" title="Delete Record">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.viewTest = function(id) {
  const test = tests.find(t => t.id === id);
  if (!test) return;

  document.getElementById('viewTestId').textContent = test.id;
  document.getElementById('viewTestResultBadge').innerHTML = renderResultBadge(test.testResult);
  document.getElementById('viewTestSource').textContent = `${test.sourceServiceName} (${test.sourceServiceId})`;
  document.getElementById('viewTestTarget').textContent = `${test.targetServiceName} (${test.targetServiceId})`;
  document.getElementById('viewTestEndpoint').textContent = `${test.httpMethod} ${test.endpoint}`;
  document.getElementById('viewTestIntRef').textContent = test.integrationId || 'Standalone';
  document.getElementById('viewTestCode').textContent = test.responseCode || '0';
  document.getElementById('viewTestLatency').textContent = test.responseTime ? `${test.responseTime} ms` : '—';
  document.getElementById('viewTestReqStatus').textContent = test.requestStatus || 'Completed';
  document.getElementById('viewTestTestedBy').textContent = test.testedBy;
  document.getElementById('viewTestDate').textContent = formatDate(test.testDate);
  document.getElementById('viewTestRemarks').textContent = test.remarks || 'No remarks logged for this test.';

  viewModal.show();
};

window.editTest = function(id) {
  const test = tests.find(t => t.id === id);
  if (!test) return;

  editingTestId = test.id;
  document.getElementById('testModalTitle').textContent = `Edit Test: ${test.id}`;
  document.getElementById('testIdInput').value = test.id;
  document.getElementById('testIdInput').disabled = true;
  document.getElementById('testIntegrationSelect').value = test.integrationId || '';
  document.getElementById('testSourceInput').value = test.sourceServiceName;
  document.getElementById('testTargetInput').value = test.targetServiceName;
  document.getElementById('testEndpointInput').value = test.endpoint;
  document.getElementById('testMethodSelect').value = test.httpMethod;
  document.getElementById('testRequestStatusSelect').value = test.requestStatus || 'Completed';
  document.getElementById('testResponseCodeInput').value = test.responseCode || 200;
  document.getElementById('testResponseTimeInput').value = test.responseTime || 0;
  document.getElementById('testResultSelect').value = test.testResult;
  document.getElementById('testDateInput').value = test.testDate;
  document.getElementById('testTestedByInput').value = test.testedBy;
  document.getElementById('testRemarksInput').value = test.remarks || '';

  testModal.show();
};

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveTestBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

  const payload = {
    id: document.getElementById('testIdInput').value.trim() || undefined,
    integrationId: document.getElementById('testIntegrationSelect').value || undefined,
    sourceServiceName: document.getElementById('testSourceInput').value.trim(),
    targetServiceName: document.getElementById('testTargetInput').value.trim(),
    endpoint: document.getElementById('testEndpointInput').value.trim(),
    httpMethod: document.getElementById('testMethodSelect').value,
    requestStatus: document.getElementById('testRequestStatusSelect').value,
    responseCode: Number(document.getElementById('testResponseCodeInput').value) || 0,
    responseTime: Number(document.getElementById('testResponseTimeInput').value) || 0,
    testResult: document.getElementById('testResultSelect').value,
    testDate: document.getElementById('testDateInput').value,
    testedBy: document.getElementById('testTestedByInput').value.trim(),
    remarks: document.getElementById('testRemarksInput').value.trim()
  };

  try {
    if (editingTestId) {
      await fetchApi(`/api/tests/${editingTestId}`, {
        method: 'PUT',
        body: payload
      });
      showToast(`Test record '${editingTestId}' updated.`);
    } else {
      const created = await fetchApi('/api/tests', {
        method: 'POST',
        body: payload
      });
      showToast(`Test record '${created.id}' recorded successfully.`);
    }

    testModal.hide();
    await loadTests();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Test Record';
  }
}

window.deleteTest = function(id) {
  showConfirmModal({
    title: 'Delete Test Record',
    message: `Are you sure you want to permanently delete test record <strong>${escapeHtml(id)}</strong>?`,
    confirmText: 'Delete Record',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await fetchApi(`/api/tests/${id}`, { method: 'DELETE' });
      showToast(`Test record '${id}' removed.`);
      await loadTests();
    }
  });
};
