
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';

interface AnalyticsData {
  recent_activity: Array<{
    date: string;
    event: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const token = localStorage.getItem('access_token');

        if (!token) {
          navigate('/auth');
          return;
        }

        const res = await fetch(`${apiUrl}/api/v1/analytics/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('access_token');
          navigate('/auth');
          return;
        }

        if (!res.ok) {
          throw new Error('Failed to load dashboard analytics.');
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
    }

    fetchAnalytics();
  }, [navigate]);

  const recent = data?.recent_activity || [];

  return (
    <Layout>
      <div className="mb-12">
        <h2 className="font-headline-xl text-headline-xl text-primary mb-4 uppercase">
          HELLO, USER.
        </h2>
        <div className="w-full h-1 bg-primary brutalist-border"></div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-gutter">

        {/* Recent AI Activity */}
        <div className="col-span-12 bg-surface-container-lowest brutalist-border overflow-hidden flex flex-col">
          <div className="p-6 border-b-4 border-primary bg-surface flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md uppercase">
              Recent AI Activity
            </h3>
            <button
              aria-label="Filter activity"
              className="material-symbols-outlined cursor-pointer hover:text-secondary-container transition-colors bg-transparent border-none p-0 text-primary dark:text-white"
            >
              filter_list
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse font-data-mono text-data-mono">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="p-4 border-r-4 border-primary font-bold">DATE</th>
                  <th className="p-4 border-r-4 border-primary font-bold">EVENT</th>
                  <th className="p-4 font-bold">STATUS</th>
                </tr>
              </thead>

              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center">
                      No recent activity. Try making a prediction!
                    </td>
                  </tr>
                ) : (
                  recent.map((item, i) => (
                    <tr
                      key={i}
                      className="border-b-4 border-primary bg-surface-container-lowest hover:bg-surface transition-colors"
                    >
                      <td className="p-4 border-r-4 border-primary">
                        {item.date}
                      </td>
                      <td className="p-4 border-r-4 border-primary">
                        {item.event}
                      </td>
                      <td className="p-4">
                        <span className="bg-[#00E5FF] px-2 py-1 text-primary brutalist-border text-xs">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Medical History */}
        <Card className="col-span-12 md:col-span-5">
          <h3 className="font-headline-md text-headline-md mb-6 uppercase">
            Medical History
          </h3>

          <div className="relative pl-6 border-l-4 border-primary space-y-8 font-data-mono text-data-mono">
            {recent.length === 0 ? (
              <p className="text-on-surface-variant">
                No history recorded yet. Use the Symptom Checker or upload reports to populate your timeline.
              </p>
            ) : (
              recent.slice(0, 3).map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[30px] top-1 w-4 h-4 bg-[#00E5FF] brutalist-border"></div>

                  <div className="mb-1 font-bold">
                    {item.date} — {item.event}
                  </div>

                  <div className="text-on-surface-variant text-sm">
                    <span className="bg-[#00E5FF] px-1 text-primary text-xs">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </Layout>
  );
}
