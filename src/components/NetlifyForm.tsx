import { useState, type FormEvent, type ReactNode } from 'react';

type NetlifyFormProps = {
  name: 'contact' | 'newsletter' | 'play-efc';
  children: (props: {
    submitted: boolean;
    submitting: boolean;
  }) => ReactNode;
  className?: string;
  encType?: 'application/x-www-form-urlencoded' | 'multipart/form-data';
  onSuccess?: () => void;
};

function formsAreLive(): boolean {
  const flag = import.meta.env.VITE_NETLIFY_FORMS;
  return flag === '1' || flag === 'true';
}

async function postToNetlify(
  form: HTMLFormElement,
  encType: NetlifyFormProps['encType'],
): Promise<void> {
  if (encType === 'multipart/form-data') {
    const response = await fetch('/', {
      method: 'POST',
      body: new FormData(form),
    });
    if (!response.ok) {
      throw new Error('Form submission failed');
    }
    return;
  }

  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === 'string') params.append(key, value);
  }
  const response = await fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    throw new Error('Form submission failed');
  }
}

/**
 * Posts to Netlify Forms when VITE_NETLIFY_FORMS is set (production deploys).
 * Local Vite and the GitHub Pages demo keep a short success state.
 */
export default function NetlifyForm({
  name,
  children,
  className,
  encType,
  onSuccess,
}: NetlifyFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setError(null);
    try {
      if (formsAreLive()) {
        await postToNetlify(form, encType);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError('Something went wrong sending the form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className={className}
      name={name}
      method="POST"
      encType={encType}
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
    >
      <input type="hidden" name="form-name" value={name} />
      <p className="form-honeypot" aria-hidden="true">
        <label>
          Don’t fill this out if you’re human:{' '}
          <input name="bot-field" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {children({ submitted, submitting })}
    </form>
  );
}
