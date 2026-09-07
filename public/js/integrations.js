/**
 * Integrations & Visual Topology Map Logic
 */

let integrations = [];
let availableServices = [];
let editingIntegrationId = null;
let integrationModal = null;
let viewModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  integrationModal = new bootstrap.Modal(document.getElementById('integrationModal'));
  viewModal = new bootstrap.Modal(document.getElementById('viewIntegrationModal'));

  await loadServices();
  await loadIntegrations();

  // Search & Filters
  document.getElementById('integrationSearchInput').addEventListener('input', applyFilters);
  document.getElementById('integrationStatusFilter').addEventListener('change', applyFilters);
  document.getElementById('integrationEnvFilter').addEventListener('change', applyFilters);
  document.getElementById('clearIntegrationFiltersBtn').addEventListener('click', () => {
    document.getElementById('integrationSearchInput').value = '';
    document.getElementById('integrationStatusFilter').value = '';
    document.getElementById('integrationEnvFilter').value = '';
    applyFilters();
  });

  // Open Add Modal
  document.getElementById('openAddIntegrationModalBtn').addEventListener('click', () => {
    editingIntegrationId = null;
    document.getElementById('integrationModalTitle').textContent = 'Add Integration Mapping';
    document.getElementById('integrationForm').reset();
    document.getElementById('intIdInput').disabled = false;
    document.getElementById('intEnvSelect').value = 'QA';
    document.getElementById('intStatusSelect').value = 'Healthy';
    document.getElementById('intMethodSelect').value = 'POST';
    document.getElementById('intAuthSelect').value = 'Bearer Token';
    populateServiceDropdowns();
    integrationModal.show();
  });

  // Form Submission
  document.getElementById('integrationForm').addEventListener('submit', handleFormSubmit);
});

async function loadServices() {
  try {
    availableServices = await fetchApi('/api/services');
  } catch (err) {
    console.error('Failed to load services for integrations:', err);
  }
}

async function loadIntegrations() {
  try {
    integrations = await fetchApi('/api/integrations');
    applyFilters();
    renderVisualTopology(integrations);
  } catch (err) {
    showToast(`Error loading integrations: ${err.message}`, 'danger');
  }
}

function populateServiceDropdowns(selectedSourceId = '', selectedTargetId = '') {
  const sourceSelect = document.getElementById('intSourceSelect');
  const targetSelect = document.getElementById('intTargetSelect');

  sourceSelect.innerHTML = `<option value="" disabled ${!selectedSourceId ? 'selected' : ''}>-- Select Source Service --</option>`;
  targetSelect.innerHTML = `<option value="" disabled ${!selectedTargetId ? 'selected' : ''}>-- Select Target Service --</option>`;

  availableServices.forEach(srv => {
    const optSource = document.createElement('option');
    optSource.value = srv.id;
    optSource.textContent = `${srv.name} (${srv.id})`;
    if (srv.id === selectedSourceId) optSource.selected = true;
    sourceSelect.appendChild(optSource);

    const optTarget = document.createElement('option');
    optTarget.value = srv.id;
    optTarget.textContent = `${srv.name} (${srv.id})`;
    if (srv.id === selectedTargetId) optTarget.selected = true;
    targetSelect.appendChild(optTarget);
  });
}

function applyFilters() {
  const searchTerm = (document.getElementById('integrationSearchInput').value || '').toLowerCase();
  const statusFilter = document.getElementById('integrationStatusFilter').value;
  const envFilter = document.getElementById('integrationEnvFilter').value;

  const filtered = integrations.filter(int => {
    const matchesSearch =
      (int.id || '').toLowerCase().includes(searchTerm) ||
      (int.sourceServiceName || '').toLowerCase().includes(searchTerm) ||
      (int.targetServiceName || '').toLowerCase().includes(searchTerm) ||
      (int.endpoint || '').toLowerCase().includes(searchTerm) ||
      (int.httpMethod || '').toLowerCase().includes(searchTerm);

    const matchesStatus = !statusFilter || int.status === statusFilter;
    const matchesEnv = !envFilter || int.environment === envFilter;

    return matchesSearch && matchesStatus && matchesEnv;
  });

  renderTable(filtered);
  renderVisualTopology(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById('integrationsTableBody');
  document.getElementById('integrationCount').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No integrations found matching current filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(int => `
    <tr>
      <td><span class="font-monospace fw-bold text-primary">${escapeHtml(int.id)}</span></td>
      <td>
        <span class="fw-semibold">${escapeHtml(int.sourceServiceName)}</span>
        <div class="text-muted font-monospace" style="font-size: 0.72rem;">${escapeHtml(int.sourceServiceId)}</div>
      </td>
      <td class="text-center text-primary"><i class="bi bi-arrow-right-circle fs-5"></i></td>
      <td>
        <span class="fw-semibold">${escapeHtml(int.targetServiceName)}</span>
        <div class="text-muted font-monospace" style="font-size: 0.72rem;">${escapeHtml(int.targetServiceId)}</div>
      </td>
      <td>
        <div class="d-flex align-items-center gap-1">
          ${renderMethodBadge(int.httpMethod)}
          <span class="font-monospace small text-primary">${escapeHtml(int.endpoint)}</span>
        </div>
      </td>
      <td><span class="badge bg-light text-dark border">${escapeHtml(int.authType)}</span></td>
      <td><span class="badge bg-secondary-subtle text-secondary">${escapeHtml(int.environment || 'QA')}</span></td>
      <td>${renderStatusBadge(int.status)}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-action" onclick="viewIntegration('${escapeHtml(int.id)}')" title="View Details">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-outline-primary btn-action" onclick="editIntegration('${escapeHtml(int.id)}')" title="Edit Integration">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-action" onclick="deleteIntegration('${escapeHtml(int.id)}')" title="Delete Integration">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderVisualTopology(list) {
  const container = document.getElementById('visualTopologyGrid');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div class="text-center py-4 text-muted">No integration mappings to display.</div>`;
    return;
  }

  container.innerHTML = list.map(int => {
    const statusClass = `flow-${(int.status || '').toLowerCase().replace(/\s+/g, '')}`;
    return `
      <div class="flow-card ${statusClass}">
        <!-- Source Service Node -->
        <div class="flow-node">
          <div class="flow-node-icon"><i class="bi bi-hdd-stack-fill"></i></div>
          <div class="flow-node-info">
            <div class="node-name">${escapeHtml(int.sourceServiceName)}</div>
            <div class="node-id">${escapeHtml(int.sourceServiceId)}</div>
          </div>
        </div>

        <!-- Directional Flow Connector -->
        <div class="flow-connector">
          <div class="d-flex align-items-center gap-2 mb-1">
            ${renderMethodBadge(int.httpMethod)}
            <span class="flow-endpoint-text" title="${escapeHtml(int.endpoint)}">${escapeHtml(int.endpoint)}</span>
          </div>
          <div class="flow-line-wrap">
            <div class="flow-line"></div>
            <i class="bi bi-caret-right-fill flow-arrow"></i>
          </div>
          <small class="text-muted" style="font-size: 0.72rem;">Auth: ${escapeHtml(int.authType)}</small>
        </div>

        <!-- Target Service Node -->
        <div class="flow-node">
          <div class="flow-node-icon"><i class="bi bi-cloud-check-fill text-success"></i></div>
          <div class="flow-node-info">
            <div class="node-name">${escapeHtml(int.targetServiceName)}</div>
            <div class="node-id">${escapeHtml(int.targetServiceId)}</div>
          </div>
        </div>

        <!-- Status & Actions -->
        <div class="d-flex flex-column align-items-end gap-1 ms-auto">
          ${renderStatusBadge(int.status)}
          <span class="font-monospace text-muted" style="font-size: 0.72rem;">${escapeHtml(int.id)}</span>
        </div>
      </div>
    `;
  }).join('');
}

window.viewIntegration = function(id) {
  const int = integrations.find(i => i.id === id);
  if (!int) return;

  document.getElementById('viewIntId').textContent = int.id;
  document.getElementById('viewIntStatus').innerHTML = renderStatusBadge(int.status);
  document.getElementById('viewIntSource').textContent = `${int.sourceServiceName} (${int.sourceServiceId})`;
  document.getElementById('viewIntTarget').textContent = `${int.targetServiceName} (${int.targetServiceId})`;
  document.getElementById('viewIntEndpoint').textContent = int.endpoint;
  document.getElementById('viewIntMethod').innerHTML = renderMethodBadge(int.httpMethod);
  document.getElementById('viewIntAuth').textContent = int.authType;
  document.getElementById('viewIntEnv').textContent = int.environment || 'QA';
  document.getElementById('viewIntDesc').textContent = int.description || 'No contract description provided.';

  viewModal.show();
};

window.editIntegration = function(id) {
  const int = integrations.find(i => i.id === id);
  if (!int) return;

  editingIntegrationId = int.id;
  document.getElementById('integrationModalTitle').textContent = `Edit Integration: ${int.id}`;
  document.getElementById('intIdInput').value = int.id;
  document.getElementById('intIdInput').disabled = true;
  document.getElementById('intEnvSelect').value = int.environment || 'QA';
  document.getElementById('intStatusSelect').value = int.status;
  document.getElementById('intMethodSelect').value = int.httpMethod;
  document.getElementById('intEndpointInput').value = int.endpoint;
  document.getElementById('intAuthSelect').value = int.authType;
  document.getElementById('intDescInput').value = int.description || '';

  populateServiceDropdowns(int.sourceServiceId, int.targetServiceId);
  integrationModal.show();
};

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveIntegrationBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

  const sourceId = document.getElementById('intSourceSelect').value;
  const targetId = document.getElementById('intTargetSelect').value;

  if (sourceId === targetId) {
    showToast('Source and Target services cannot be identical.', 'warning');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Integration';
    return;
  }

  const payload = {
    id: document.getElementById('intIdInput').value.trim() || undefined,
    sourceServiceId: sourceId,
    targetServiceId: targetId,
    endpoint: document.getElementById('intEndpointInput').value.trim(),
    httpMethod: document.getElementById('intMethodSelect').value,
    authType: document.getElementById('intAuthSelect').value,
    environment: document.getElementById('intEnvSelect').value,
    status: document.getElementById('intStatusSelect').value,
    description: document.getElementById('intDescInput').value.trim()
  };

  try {
    if (editingIntegrationId) {
      await fetchApi(`/api/integrations/${editingIntegrationId}`, {
        method: 'PUT',
        body: payload
      });
      showToast(`Integration '${editingIntegrationId}' updated successfully.`);
    } else {
      const created = await fetchApi('/api/integrations', {
        method: 'POST',
        body: payload
      });
      showToast(`Integration '${created.id}' created successfully.`);
    }

    integrationModal.hide();
    await loadIntegrations();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Integration';
  }
}

window.deleteIntegration = function(id) {
  const int = integrations.find(i => i.id === id);
  if (!int) return;

  showConfirmModal({
    title: 'Delete Integration Confirmation',
    message: `Are you sure you want to delete integration <strong>${escapeHtml(int.id)}</strong> (${escapeHtml(int.sourceServiceName)} → ${escapeHtml(int.targetServiceName)})?<br><br><span class="text-danger small">Note: Active defects linked to this integration will block deletion.</span>`,
    confirmText: 'Delete Integration',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await fetchApi(`/api/integrations/${id}`, { method: 'DELETE' });
      showToast(`Integration '${int.id}' deleted successfully.`);
      await loadIntegrations();
    }
  });
};
