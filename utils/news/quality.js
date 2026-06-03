function sourceSentences(text = '') {
  return text
    .split(/[.!?]\s+/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter((part) => part.length > 80);
}

export function validateGeneratedPost({ article, generated }) {
  const errors = [];
  const markdown = generated.markdown || '';

  if (!generated.title || generated.title.length < 12) errors.push('Generated title is too short');
  if (!generated.description || generated.description.length < 50) errors.push('Generated description is too short');
  if (!generated.slug) errors.push('Generated slug is missing');
  if (!markdown || markdown.split(/\s+/).length < 250) errors.push('Generated markdown is too short');
  if (/<\/?[a-z][\s\S]*>/i.test(markdown)) errors.push('Generated markdown contains HTML');
  if (/<script|<iframe|onerror=|onclick=/i.test(markdown)) errors.push('Generated markdown contains unsafe markup');

  const lowerMarkdown = markdown.toLowerCase();
  const copied = sourceSentences(article.text).filter((sentence) => lowerMarkdown.includes(sentence.toLowerCase()));
  if (copied.length > 1) errors.push('Generated markdown appears to copy source sentences');

  return errors;
}
