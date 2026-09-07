/**
 * Services Management Page Logic
 */

let services = [];
let editingServiceId = null;
let serviceModal = null;
let viewModal = null;

document.addEventListener('DOMContentLoaded', async () => {
  serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));
  viewModal = new bootstrap.Modal(document.getElementById('viewServiceModal'));

  await loadServices();

  // Search & Filter listeners
  document.getElementById('serviceSearchInput').addEventListener('input', applyFilters);
  document.getElementById('serviceStatusFilter').addEventListener('change', applyFilters);
  document.getElementById('serviceTypeFilter').addEventListener('change', applyFilters);
  document.getElementById('clearServiceFiltersBtn').addEventListener('click', () => {
    document.getElementById('serviceSearchInput').value = '';
    document.getElementById('serviceStatusFilter').value = '';
    document.getElementById('serviceTypeFilter').value = '';
    applyFilters();
  });

  // Add Service Modal trigger
  document.getElementById('openAddServiceModalBtn').addEventListener('click', () => {
    editingServiceId = null;
    document.getElementById('serviceModalTitle').textContent = 'Add New Service';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceIdInput').disabled = false;
    document.getElementById('serviceEnvSelect').value = 'QA';
    document.getElementById('serviceStatusSelect').value = 'Active';
    serviceModal.show();
  });

  // Form Submit (Create or Update)
  document.getElementById('serviceForm').addEventListener('submit', handleFormSubmit);
});

async function loadServices() {
  try {
    services = await fetchApi('/api/services');
    applyFilters();
  } catch (err) {
    showToast(`Error loading services: ${err.message}`, 'danger');
  }
}

function applyFilters() {
  const searchTerm = (document.getElementById('serviceSearchInput').value || '').toLowerCase();
  const statusFilter = document.getElementById('serviceStatusFilter').value;
  const typeFilter = document.getElementById('serviceTypeFilter').value;

  const filtered = services.filter(srv => {
    const matchesSearch =
      (srv.name || '').toLowerCase().includes(searchTerm) ||
      (srv.id || '').toLowerCase().includes(searchTerm) ||
      (srv.owner || '').toLowerCase().includes(searchTerm) ||
      (srv.baseUrl || '').toLowerCase().includes(searchTerm);

    const matchesStatus = !statusFilter || srv.status === statusFilter;
    const matchesType = !typeFilter || srv.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  renderTable(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById('servicesTableBody');
  document.getElementById('serviceCount').textContent = list.length;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No services found matching current criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(srv => `
    <tr>
      <td><span class="font-monospace fw-bold text-primary">${escapeHtml(srv.id)}</span></td>
      <td>
        <span class="fw-bold">${escapeHtml(srv.name)}</span>
        ${srv.description ? `<div class="text-muted small text-truncate" style="max-width: 250px;">${escapeHtml(srv.description)}</div>` : ''}
      </td>
      <td><span class="badge bg-light text-dark border">${escapeHtml(srv.type)}</span></td>
      <td>${escapeHtml(srv.owner)}</td>
      <td><span class="font-monospace small text-muted text-truncate d-inline-block" style="max-width: 200px;">${escapeHtml(srv.baseUrl)}</span></td>
      <td><span class="badge bg-secondary-subtle text-secondary">${escapeHtml(srv.environment || 'QA')}</span></td>
      <td>${renderStatusBadge(srv.status)}</td>
      <td class="text-end">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary btn-action" onclick="viewService('${escapeHtml(srv.id)}')" title="View Details">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-outline-primary btn-action" onclick="editService('${escapeHtml(srv.id)}')" title="Edit Service">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-action" onclick="deleteService('${escapeHtml(srv.id)}')" title="Delete Service">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

window.viewService = function(id) {
  const srv = services.find(s => s.id === id);
  if (!srv) return;

  document.getElementById('viewServiceId').textContent = srv.id;
  document.getElementById('viewServiceName').textContent = srv.name;
  document.getElementById('viewServiceType').textContent = srv.type;
  document.getElementById('viewServiceOwner').textContent = srv.owner;
  document.getElementById('viewServiceEnv').textContent = srv.environment || 'QA';
  document.getElementById('viewServiceUrl').textContent = srv.baseUrl;
  document.getElementById('viewServiceStatus').innerHTML = renderStatusBadge(srv.status);
  document.getElementById('viewServiceDesc').textContent = srv.description || 'No description provided.';

  viewModal.show();
};

window.editService = function(id) {
  const srv = services.find(s => s.id === id);
  if (!srv) return;

  editingServiceId = srv.id;
  document.getElementById('serviceModalTitle').textContent = `Edit Service: ${srv.name}`;
  document.getElementById('serviceIdInput').value = srv.id;
  document.getElementById('serviceIdInput').disabled = true;
  document.getElementById('serviceNameInput').value = srv.name;
  document.getElementById('serviceTypeSelect').value = srv.type;
  document.getElementById('serviceOwnerInput').value = srv.owner;
  document.getElementById('serviceBaseUrlInput').value = srv.baseUrl;
  document.getElementById('serviceEnvSelect').value = srv.environment || 'QA';
  document.getElementById('serviceStatusSelect').value = srv.status;
  document.getElementById('serviceDescInput').value = srv.description || '';

  serviceModal.show();
};

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById('saveServiceBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Saving...`;

  const payload = {
    id: document.getElementById('serviceIdInput').value.trim() || undefined,
    name: document.getElementById('serviceNameInput').value.trim(),
    type: document.getElementById('serviceTypeSelect').value,
    owner: document.getElementById('serviceOwnerInput').value.trim(),
    baseUrl: document.getElementById('serviceBaseUrlInput').value.trim(),
    environment: document.getElementById('serviceEnvSelect').value,
    status: document.getElementById('serviceStatusSelect').value,
    description: document.getElementById('serviceDescInput').value.trim()
  };

  try {
    if (editingServiceId) {
      await fetchApi(`/api/services/${editingServiceId}`, {
        method: 'PUT',
        body: payload
      });
      showToast(`Service '${payload.name}' updated successfully.`);
    } else {
      await fetchApi('/api/services', {
        method: 'POST',
        body: payload
      });
      showToast(`Service '${payload.name}' created successfully.`);
    }

    serviceModal.hide();
    await loadServices();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Service';
  }
}

window.deleteService = function(id) {
  const srv = services.find(s => s.id === id);
  if (!srv) return;

  showConfirmModal({
    title: 'Delete Service Confirmation',
    message: `Are you sure you want to permanently delete service <strong>${escapeHtml(srv.name)}</strong> (<code>${escapeHtml(srv.id)}</code>)?<br><br><span class="text-danger small">Note: Services linked to active integrations cannot be removed.</span>`,
    confirmText: 'Delete Service',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      await fetchApi(`/api/services/${id}`, { method: 'DELETE' });
      showToast(`Service '${srv.name}' deleted successfully.`);
      await loadServices();
    }
  });
};
