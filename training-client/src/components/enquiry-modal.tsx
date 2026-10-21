'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/button';
import { apiFetch, getErrorMessage } from '@/lib/api';

const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-navy-900 outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-100';

export default function EnquiryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function closeModal() {
    if (loading) return;
    setIsOpen(false);
    setError('');
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        setIsOpen(false);
        setError('');
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      setError('Please complete all fields.');
      return;
    }

    if (trimmedMessage.length > 3000) {
      setError('Your message cannot exceed 3,000 characters.');
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/enquiries/public', {
        method: 'POST',
        json: {
          name: trimmedName,
          email: trimmedEmail,
          text: trimmedMessage,
        },
        skipRefresh: true,
      });

      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="accent"
        pill
        className="min-w-[190px] px-10 py-4 text-base"
        onClick={() => {
          setSuccess(false);
          setError('');
          setIsOpen(true);
        }}
      >
        Make an Enquiry
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={closeModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="enquiry-title"
            className="relative my-auto w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              aria-label="Close enquiry form"
              className="absolute right-4 top-4 rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            {success ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 4 4L19 6" />
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-black">
                  Enquiry submitted!
                </h2>

                <p className="mt-3 text-gray-600">
                  Thank you for contacting Ropetech Training.
                  A response will be sent to your email soon.
                </p>

                <Button
                  type="button"
                  pill
                  className="mt-6"
                  onClick={() => setIsOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <h2
                  id="enquiry-title"
                  className="pr-8 text-2xl font-bold text-black sm:text-3xl"
                >
                  Make an Enquiry
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Have a question about our training? Send us a message and
                  we&apos;ll get back to you with your email.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label
                      htmlFor="enquiry-name"
                      className="mb-2 block text-sm font-semibold text-navy-900"
                    >
                      Full name
                    </label>
                    <input
                      id="enquiry-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={150}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="enquiry-email"
                      className="mb-2 block text-sm font-semibold text-navy-900"
                    >
                      Email address
                    </label>
                    <input
                      id="enquiry-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label
                        htmlFor="enquiry-message"
                        className="text-sm font-semibold text-navy-900"
                      >
                        Your message
                      </label>
                      <span
                        className={`text-xs ${
                          message.length >= 3000
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {message.length}/3000
                      </span>
                    </div>

                    <textarea
                      id="enquiry-message"
                      name="text"
                      required
                      rows={5}
                      maxLength={3000}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Tell us what you'd like to know..."
                      className={`${inputClass} resize-y`}
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      pill
                      disabled={loading}
                      onClick={closeModal}
                    >
                      Cancel
                    </Button>

                    <Button type="submit" pill disabled={loading}>
                      {loading ? 'Sending...' : 'Send Enquiry'}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
