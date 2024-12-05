import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async (name = '') => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/getPlan${name ? `?name=${name}` : ''}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.result); // Access the 'result' field from your JSON response
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data from the API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    if (name.trim()) {
      await fetchData(name);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Azure Static Web App with Functions</h1>

      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-blue-600">Loading...</div>
        ) : error ? (
          <div className="text-red-600">
            {error}
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-2">Message from API:</h2>
            <div className="bg-gray-50 p-4 rounded-md">
              {message}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;