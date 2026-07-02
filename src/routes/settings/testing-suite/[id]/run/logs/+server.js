import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export function GET({ params, request, url }) {
  const runId = params.id;
  const logFile = join(process.cwd(), 'data', 'agent_logs', `${runId}.log`);

  const raw = url.searchParams.get('raw') === 'true';
  if (raw) {
    if (!existsSync(logFile)) {
      return new Response(JSON.stringify({ logs: [] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404
      });
    }
    try {
      const content = readFileSync(logFile, 'utf-8');
      const logs = content.split('\n').filter(line => line.trim() !== '');
      return new Response(JSON.stringify({ logs }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      let position = 0;
      let interval;

      const sendLog = () => {
        if (!existsSync(logFile)) return;
        
        try {
          const content = readFileSync(logFile, 'utf-8');
          if (content.length > position) {
            const newContent = content.slice(position);
            position = content.length;
            
            const lines = newContent.split('\n');
            for (const line of lines) {
              if (line.trim() !== '') {
                controller.enqueue(`data: ${JSON.stringify({ text: line })}\n\n`);
              }
            }
          }
        } catch (e) {
          console.error('[SSE] Error reading log file:', e);
        }
      };

      sendLog();

      interval = setInterval(sendLog, 500);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
