/**
 * Defect Tracking Page Logic
 */

let defects = [];
let integrations = [];
let editingDefectId = null;
let defectModal = null;
let viewModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  defectModal = new bootstrap.Modal(document.getElementById('defectModal'));
  viewModal = new bootstrap.Modal(document.getElementById('viewDefectModal'));

  await loadIntegrations();
  await loadDefects();

  // Search and Filter Listeners
  document.getElementById('defectSearchInput').addEventListener('input', applyFilters);
  document.getElementById('defectSeverityFilter').addEventListener('change', applyFilters);
  document.getElementById('defectPriorityFilter').addEventListener('change', applyFilters);
  document.getElementById('defectStatusFilter').addEventListener('change', applyFilters);
  document.getElementById('clearDefectFiltersBtn').addEventListener('click', () => {
    document.getElementById('defectSearchInput').value = '';
    document.getElementById('defectSeverityFilter').value = '';
    document.getElementById('defectPriorityFilter').value = '';
    document.getElementById('defectStatusFilter').value = '';
    applyFilters();
  });

  // Open Add Defect Modal
  document.getElementById('openAddDefectModalBtn').addEventListener('click', () => {
    editingDefectId = null;
    document.getElementById('defectModalTitle').textContent = 'Log Integration Defect';
    document.getElementById('defectForm').reset();
    document.getElementById('defIdInput').disabled = false;
    document.getElementById('defSeveritySelect').value = 'High';
    document.getElementById('defPrioritySelect').value = 'P1';
    document.getElementById('defStatusSelect').value = 'Open';
    populateIntegrationDropdown();
    defectModal.show();
  });

  // Form Submit
  document.getElementById('defectForm').addEventListener('submit', handleFormSubmit);
});

async function loadIntegrations() {
  try {
    integrations = await fetchApi('/api/integrations');
  } catch (err) {
    console.error('Failed to load integrations for defects:', err);
  }
}

function populateIntegrationDropdown(selectedId = '') {
  const select = document.getElementById('defIntegrationSelect');
  select.innerHTML = `<option value="" disabled ${!selectedId ? 'selected' : ''}>-- Select affected integration mapping --</option>`;

  integrations.forEach(i => {
    const opt = document.createElement('option');
    opt.value = i.id;
    opt.textContent = `[${i.id}] ${i.sourceServiceName} → ${i.targetServiceName} (${i.httpMethod} ${i.endpoint})`;
    if (i.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

async function loadDefects() {
  try {
    defects = await fetchApi('/api/defects');
    applyFilters();
  } catch (err) {
    showToast(`Error loading defects: ${err.message}`, 'danger');
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById('defectSearchInput').value || '').toLowerCase();
  const severityFilter = document.getElementById('defectSeverityFilter').value;
  const priorityFilter = document.getElementById('defectPriorityFilter').value;
  const statusFilter = document.getElementById('defectStatusFilter').value;

  const filtered = defects.filter(d => {
    const matchesSearch =
      (d.id || '').toLowerCase().includes(searchTerm) ||
      (d.title || '').toLowerCase().includes(searchTerm) ||
      (d.description || '').toLowerCase().includes(searchTerm) ||
      (d.assignedTo || '').toLowerCase().includes(searchTerm) ||
      (d.reportedBy || '').toLowerCase().includes(searchTerm) ||
      (d.relatedIntegrationName || '').toLowerCase().includes(searchTerm);

    const matchesSeverity = !severityFilter || d.severity === severityFilter;
    const matchesPriority = !priorityFilter || d.priority === priorityFilter;
    const matchesStatus = !statusFilter || d.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesPriority && matchesStatus;
  });

  renderTable(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById('defectsTableBody');
  document.getElementById('defectCount').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No defects found matching current filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(d => `
    <tr>
      <td><span class="font-monospace fw-bold text-danger">${escapeHtml(d.id)}</span></td>
      <td>
        <div class="fw-bold">${escapeHtml(d.title)}</div>
        <div class="text-muted small text-truncate" style="max-width: 250px;">${escapeHtml(d.description || 'No description.')}</div>
      </td>
      <td>
        <span class="badge bg-light text-dark border font-monospace">${escapeHtml(d.relatedIntegrationId)}</span>
        <div class="text-muted small text-truncate" style="max-width: 200px;" title="${escapeHtml(d.relatedIntegrationName)}">
          ${escapeHtml(d.relatedIntegrationName)}
        </div>
      </td>
      <td>${renderSeverityBadge(d.severity)}</td>
      <td>${renderPriorityBadge(d.priority)}</td>
      <td>${renderStatusBadge(d.status)}</td>
      <td class="small">${escapeHtml(d.assignedTo || 'Unassigned')}</td>
      <td class="small text-muted">${escapeHtml(d.reportedBy || '—')}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-action" onclick="viewDefect('${escapeHtml(d.id)}')" title="View Defect">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-outline-primary btn-action" onclick="editDefect('${escapeHtml(d.id)}')" title="Edit Defect">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-action" onclick="deleteDefect('${escapeHtml(d.id)}')" title="Delete Defect">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.viewDefect = function(id) {
  const d = defects.find(def => def.id === id);
  if (!d) return;

  document.getElementById('viewDefId').textContent = d.id;
  document.getElementById('viewDefTitle').textContent = d.title;
  document.getElementById('viewDefBadges').innerHTML = `
    ${renderSeverityBadge(d.severity)}
    ${renderPriorityBadge(d.priority)}
    ${renderStatusBadge(d.status)}
  `;
  document.getElementById('viewDefInt').textContent = `[${d.relatedIntegrationId}] ${d.relatedIntegrationName}`;
  document.getElementById('viewDefExpected').textContent = d.expectedResult || 'Not specified';
  document.getElementById('viewDefActual').textContent = d.actualResult || 'Not specified';
  document.getElementById('viewDefAssigned').textContent = d.assignedTo || 'Unassigned';
  document.getElementById('viewDefReported').textContent = d.reportedBy || 'Anonymous';
  document.getElementById('viewDefDate').textContent = formatDate(d.createdDate);
  document.getElementById('viewDefDesc').textContent = d.description || 'No description provided.';

  viewModal.show();
};

window.editDefect = function(id) {
  const d = defects.find(def => def.id === id);
  if (!d) return;

  editingDefectId = d.id;
  document.getElementById('defectModalTitle').textContent = `Edit Defect: ${d.id}`;
  document.getElementById('defIdInput').value = d.id;
  document.getElementById('defIdInput').disabled = true;
  document.getElementById('defTitleInput').value = d.title;
  document.getElementById('defSeveritySelect').value = d.severity;
  document.getElementById('defPrioritySelect').value = d.priority;
  document.getElementById('defStatusSelect').value = d.status;
  document.getElementById('defAssignedToInput').value = d.assignedTo || '';
  document.getElementById('defReportedByInput').value = d.reportedBy || '';
  document.getElementById('defDescInput').value = d.description || '';
  document.getElementById('defExpectedInput').value = d.expectedResult || '';
  document.getElementById('defActualInput').value = d.actualResult || '';

  populateIntegrationDropdown(d.relatedIntegrationId);
  defectModal.show();
};

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveDefectBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

  const payload = {
    id: document.getElementById('defIdInput').value.trim() || undefined,
    title: document.getElementById('defTitleInput').value.trim(),
    relatedIntegrationId: document.getElementById('defIntegrationSelect').value,
    severity: document.getElementById('defSeveritySelect').value,
    priority: document.getElementById('defPrioritySelect').value,
    status: document.getElementById('defStatusSelect').value,
    assignedTo: document.getElementById('defAssignedToInput').value.trim(),
    reportedBy: document.getElementById('defReportedByInput').value.trim(),
    description: document.getElementById('defDescInput').value.trim(),
    expectedResult: document.getElementById('defExpectedInput').value.trim(),
    actualResult: document.getElementById('defActualInput').value.trim()
  };

  try {
    if (editingDefectId) {
      await fetchApi(`/api/defects/${editingDefectId}`, {
        method: 'PUT',
        body: payload
      });
      showToast(`Defect '${editingDefectId}' updated successfully.`);
    } else {
      const created = await fetchApi('/api/defects', {
        method: 'POST',
        body: payload
      });
      showToast(`Defect '${created.id}' logged successfully.`);
    }

    defectModal.hide();
    await loadDefects();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Defect';
  }
}

window.deleteDefect = function(id) {
  showConfirmModal({
    title: 'Delete Defect Confirmation',
    message: `Are you sure you want to delete defect <strong>${escapeHtml(id)}</strong>?`,
    confirmText: 'Delete Defect',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await fetchApi(`/api/defects/${id}`, { method: 'DELETE' });
      showToast(`Defect '${id}' deleted successfully.`);
      await loadDefects();
    }
  });
};
