// src/app/page.tsx
'use client'; // This marks the component as a Client Component

import { useState, FormEvent } from 'react';

export default function Home() {
  const [emailText, setEmailText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Sample email for easy testing
  const sampleEmail = `From: Hilary <hrod17@clintonemail.com>\nTo: John Doe <huma@clintonemail.com>\nDate: 2011-11-23 20:06\nSubject: Re: Fw: comics\n\nPlease print the comic books.`;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!emailText.trim()) {
      setStatusMessage('Box cannot be empty');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');
    setIsError(false);

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent: emailText }),
      });

      const result = await response.json();

      if (!response.ok) {
        // If the server returns an error, throw it to the catch block
        throw new Error(result.error || 'Something went wrong on the server.');
      }
      
      setStatusMessage('Success! Email parsed and added to Google Sheet.');
      setIsError(false);
      setEmailText(''); // Clear the textarea on success

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      setStatusMessage(`Error: ${errorMessage}`);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Email Parser Tool</h1>
        <p className="text-gray-600 mb-6">
          Paste an email below. The tool will use AI to identify what is being printed and who is printing it, then add it to a Google Sheet.
        </p>
        <a 
              href="https://docs.google.com/spreadsheets/d/1GcIkofF2AAxI7_lZxMGPns88Hdg93Spy9FlLKrW1Vws/edit?usp=sharing"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              View Google Sheet ↗
            </a>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <button
                type="button"
                onClick={() => setEmailText(sampleEmail)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Click to paste Sample Email
              </button>
            </div>
            <textarea
              id="emailContent"
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={12}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              placeholder="Paste the full email content here..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Processing...' : 'Parse and Add to Sheet'}
          </button>
        </form>

        {statusMessage && (
          <div className={`mt-4 p-3 rounded-md text-sm ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {statusMessage}
          </div>
        )}
      </div>
    </main>
  );
}