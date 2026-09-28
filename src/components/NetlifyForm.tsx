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

/**
 * Phase 1: mock submit with Netlify-shaped markup.
 * Phase 2: remove preventDefault mock and POST to Netlify Forms (or use AJAX).
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    // Simulate a short network delay for the prototype.
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      onSuccess?.();
    }, 400);
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
      {children({ submitted, submitting })}
    </form>
  );
}
