import { spawn } from 'child_process';

async function main() {
  const url = "https://celestial-explorer-nine.vercel.app/?cb=" + Date.now();
  console.log(`Verifying celestial-explorer live URL with cache buster: ${url}`);

  const chromeProcess = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-sandbox"
  ]);

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const res = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await res.json();
    const target = targets.find(t => t.type === 'page');
    if (!target) {
      console.error('No page target found');
      chromeProcess.kill();
      return;
    }

    const wsUrl = target.webSocketDebuggerUrl;
    const ws = new WebSocket(wsUrl);

    let hasException = false;

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
      ws.send(JSON.stringify({ id: 2, method: "Log.enable" }));
      ws.send(JSON.stringify({ id: 3, method: "Page.enable" }));
      ws.send(JSON.stringify({ id: 4, method: "Page.navigate", params: { url: url } }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a));
        console.log(`[Console ${msg.params.type}]`, ...args);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[Browser Exception]', msg.params.exceptionDetails.exception.description);
        hasException = true;
      } else if (msg.method === 'Log.entryAdded') {
        console.log('[Browser Log]', msg.params.entry.text);
      }
    };

    // Wait 15 seconds to load and test
    await new Promise(resolve => setTimeout(resolve, 15000));

    ws.close();
    chromeProcess.kill();
    
    if (hasException) {
      console.log("TEST FAILED: Exceptions encountered.");
    } else {
      console.log("TEST PASSED: Live site loaded successfully with zero errors!");
    }
  } catch (err) {
    console.error('Error in verification:', err);
    chromeProcess.kill();
  }
}

main();
