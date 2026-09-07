/**
 * SIT Coordinator - Shared Global Utilities & Application Logic
 */

// Global API Request Helper
async function fetchApi(url, options = {}) {
  try {
    const defaultHeaders = { 'Content-Type': 'application/json' };
    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {})
      }
    };
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data && data.error ? data.error : `HTTP error ${response.status}`;
      throw new Error(errorMessage);
    }
    return data;
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    throw error;
  }
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'custom-toast';

  let icon = 'bi-check-circle-fill text-success';
  if (type === 'danger' || type === 'error') {
    icon = 'bi-exclamation-octagon-fill text-danger';
  } else if (type === 'warning') {
    icon = 'bi-exclamation-triangle-fill text-warning';
  } else if (type === 'info') {
    icon = 'bi-info-circle-fill text-primary';
  }

  toast.innerHTML = `
    <i class="bi ${icon} fs-5"></i>
    <div class="flex-grow-1 fs-sm">${escapeHtml(message)}</div>
    <button type="button" class="btn-close ms-auto" style="font-size: 0.75rem;"></button>
  `;

  toast.querySelector('.btn-close').addEventListener('click', () => toast.remove());
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, 4000);
}

// HTML escape helper
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

// Badge Helpers
function renderResultBadge(result) {
  const r = (result || 'NOT RUN').toUpperCase();
  if (r === 'PASS') {
    return `<span class="badge-soft badge-pass"><i class="bi bi-check-circle-fill"></i> PASS</span>`;
  }
  if (r === 'FAIL') {
    return `<span class="badge-soft badge-fail"><i class="bi bi-x-circle-fill"></i> FAIL</span>`;
  }
  if (r === 'BLOCKED') {
    return `<span class="badge-soft badge-blocked"><i class="bi bi-slash-circle-fill"></i> BLOCKED</span>`;
  }
  return `<span class="badge-soft badge-not-run"><i class="bi bi-dash-circle"></i> NOT RUN</span>`;
}

function renderStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s === 'active' || s === 'healthy') {
    return `<span class="badge-soft badge-active"><i class="bi bi-dot fs-5 p-0"></i> ${escapeHtml(status)}</span>`;
  }
  if (s === 'warning' || s === 'in progress') {
    return `<span class="badge-soft badge-warning"><i class="bi bi-dot fs-5 p-0"></i> ${escapeHtml(status)}</span>`;
  }
  if (s === 'failed' || s === 'open') {
    return `<span class="badge-soft badge-open"><i class="bi bi-dot fs-5 p-0"></i> ${escapeHtml(status)}</span>`;
  }
  if (s === 'resolved') {
    return `<span class="badge-soft badge-resolved"><i class="bi bi-check-all"></i> Resolved</span>`;
  }
  if (s === 'closed') {
    return `<span class="badge-soft badge-closed"><i class="bi bi-archive"></i> Closed</span>`;
  }
  if (s === 'maintenance') {
    return `<span class="badge-soft badge-maintenance"><i class="bi bi-wrench-adjustable"></i> Maintenance</span>`;
  }
  if (s === 'inactive') {
    return `<span class="badge-soft badge-inactive">Inactive</span>`;
  }
  return `<span class="badge-soft badge-not-run">${escapeHtml(status || 'Not Tested')}</span>`;
}

function renderSeverityBadge(severity) {
  const s = (severity || 'Medium').toLowerCase();
  if (s === 'critical') {
    return `<span class="badge-soft badge-critical"><i class="bi bi-lightning-charge-fill"></i> Critical</span>`;
  }
  if (s === 'high') {
    return `<span class="badge-soft badge-high"><i class="bi bi-exclamation-circle-fill"></i> High</span>`;
  }
  if (s === 'medium') {
    return `<span class="badge-soft badge-medium"><i class="bi bi-exclamation-triangle"></i> Medium</span>`;
  }
  return `<span class="badge-soft badge-low"><i class="bi bi-info-circle"></i> Low</span>`;
}

function renderPriorityBadge(priority) {
  const p = (priority || 'P2').toUpperCase();
  let cls = 'prio-p2';
  if (p === 'P1') cls = 'prio-p1';
  else if (p === 'P3') cls = 'prio-p3';
  else if (p === 'P4') cls = 'prio-p4';
  return `<span class="${cls}"><i class="bi bi-flag-fill me-1"></i>${p}</span>`;
}

function renderMethodBadge(method) {
  const m = (method || 'GET').toUpperCase();
  return `<span class="method-badge method-${m}">${m}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Shared Confirmation Modal Dialog
function showConfirmModal({ title, message, confirmText = 'Delete', confirmClass = 'btn-danger', onConfirm }) {
  let modalEl = document.getElementById('globalConfirmModal');
  if (!modalEl) {
    modalEl = document.createElement('div');
    modalEl.id = 'globalConfirmModal';
    modalEl.className = 'modal fade';
    modalEl.setAttribute('tabindex', '-1');
    modalEl.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title font-weight-bold" id="confirmModalTitle">Confirm Action</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="confirmModalBody">Are you sure?</div>
          <div class="modal-footer">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn" id="confirmModalActionBtn">Confirm</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
  }

  document.getElementById('confirmModalTitle').textContent = title || 'Confirm Action';
  document.getElementById('confirmModalBody').innerHTML = message || 'Are you sure you want to proceed?';
  const actionBtn = document.getElementById('confirmModalActionBtn');
  actionBtn.textContent = confirmText;
  actionBtn.className = `btn ${confirmClass}`;

  const bsModal = new bootstrap.Modal(modalEl);

  actionBtn.onclick = async () => {
    actionBtn.disabled = true;
    actionBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Processing...`;
    try {
      if (onConfirm) await onConfirm();
      bsModal.hide();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      actionBtn.disabled = false;
      actionBtn.textContent = confirmText;
    }
  };

  bsModal.show();
}

// Mobile sidebar & active route initialization
document.addEventListener('DOMContentLoaded', () => {
  // Highlight active sidebar navigation
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.sidebar-menu .nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '/' && href === '/index.html') || (href !== '/' && currentPath.endsWith(href))) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Mobile sidebar toggle
  const sidebarToggle = document.querySelector('.sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
      backdrop.classList.toggle('show');
    });
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('show');
      backdrop.classList.remove('show');
    });
  }

  // Check API health status
  fetchApi('/api/health')
    .then(data => {
      const healthBadge = document.getElementById('apiHealthIndicator');
      if (healthBadge) {
        healthBadge.innerHTML = `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-circle-fill me-1" style="font-size: 0.55rem;"></i> API Online</span>`;
      }
    })
    .catch(() => {
      const healthBadge = document.getElementById('apiHealthIndicator');
      if (healthBadge) {
        healthBadge.innerHTML = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-exclamation-circle-fill me-1"></i> API Offline</span>`;
      }
    });
});
