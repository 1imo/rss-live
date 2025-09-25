import type { APIRoute } from 'astro';
import { subscribeEmail, unsubscribeEmail, getActiveSubscribers, exportSubscribersJSON, exportSubscribersCSV } from '../../utils/newsletter';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { action, email, format } = await request.json();

    switch (action) {
      case 'subscribe':
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Email is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }

        const subscribeResult = await subscribeEmail(email);
        return new Response(JSON.stringify(subscribeResult), {
          status: subscribeResult.success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });

      case 'unsubscribe':
        if (!email) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Email is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }

        const unsubscribeResult = await unsubscribeEmail(email);
        return new Response(JSON.stringify(unsubscribeResult), {
          status: unsubscribeResult.success ? 200 : 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });

      case 'export':
        try {
          let data: string;
          let contentType: string;
          let filename: string;

          if (format === 'csv') {
            data = await exportSubscribersCSV();
            contentType = 'text/csv';
            filename = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
          } else {
            data = await exportSubscribersJSON();
            contentType = 'application/json';
            filename = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.json`;
          }

          return new Response(data, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${filename}"`
            }
          });
        } catch (error) {
          console.error('Error exporting subscribers:', error);
          return new Response(JSON.stringify({
            success: false,
            message: 'Error exporting subscribers'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json'
            }
          });
        }

      default:
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid action'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('Newsletter API error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const action = url.searchParams.get('action');

    switch (action) {
      case 'subscribers':
        const subscribers = await getActiveSubscribers();
        return new Response(JSON.stringify({
          success: true,
          subscribers: subscribers.map(sub => ({
            email: sub.email,
            subscribedAt: sub.subscribedAt
          })),
          count: subscribers.length
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid action'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        });
    }
  } catch (error) {
    console.error('Newsletter API GET error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
