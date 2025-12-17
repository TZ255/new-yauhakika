import { SITE } from '../config/site.js';

export function pageMeta({ title, description, path = '/', image }) {
  return {
    title: title || SITE.name,
    description: description || SITE.description,
    canonical: `${SITE.url}${path}`,
    image: image || SITE.defaultImage,
  };
}
