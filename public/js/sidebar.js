(function () {
  const body = document.body;
  const toggleBtn = document.getElementById('sidebarToggle');
  const closeBtn = document.getElementById('sidebarClose');
  const sidebar = document.getElementById('sidebar');
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  function openSidebar() {
    body.classList.add('sidebar-open');
    overlay.classList.add('show');
  }
  function closeSidebar() {
    body.classList.remove('sidebar-open');
    overlay.classList.remove('show');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  overlay.addEventListener('click', closeSidebar);
  if (sidebar) {
    sidebar.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && body.classList.contains('sidebar-open')) {
        closeSidebar();
      }
    });
  }
})();
