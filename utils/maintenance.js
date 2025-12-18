import { pageMeta } from './meta.js';

const defaultTitle = 'Huduma ipo kwenye matengenezo';
const defaultDescription = 'Huduma inafanyiwa matengenezo. Itarudi hewani muda si mrefu.';

export function maintenancePage({ path = '/maintenance', title = defaultTitle, description = defaultDescription } = {}) {
  return {
    status: 503,
    view: 'pages/maintenance',
    locals: {
      activeId: null,
      meta: pageMeta({ title, description, path }),
    },
  };
}

export function renderMaintenance(res, options = {}) {
  const { status, view, locals } = maintenancePage(options);
  return res.status(status).render(view, locals);
}
