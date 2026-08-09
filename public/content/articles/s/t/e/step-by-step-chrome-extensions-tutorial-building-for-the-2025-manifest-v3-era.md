---
seo_title: "Building Extensions for the Manifest V3 Era"
id: c18dec57-79d4-44fa-968e-01c6b9c4960e
title: 'Step-by-Step Chrome Extensions Tutorial: Building for the 2025 Manifest V3 Era'
slug: step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era
excerpt: >-
  Discover the future of browser extensions with our curated, high-performance
  directory.
featured_image: >-
  /content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/featured.webp
category: Security & Privacy
tags:
  - >-
    Step-by-Step Chrome Extensions Tutorial: Building for the 2025 Manifest V3
    Era
keywords:
  - browser extensions
  - premium tools
  - productivity
meta_description: "A developer's tutorial for building Chrome extensions in the Manifest V3 era, covering the 2025 shift away from Manifest V2."
status: published
published_at: '2026-03-18T20:11:00.24+00:00'
scheduled_at: '2026-03-18T20:11:00+00:00'
author: James Mitchell
author_image: /content/images/authors/james-mitchell.png
views: 0
read_time: 1
created_at: '2026-01-19T13:56:52.373854+00:00'
updated_at: '2026-04-23T12:29:22.061228+00:00'
---

<img src="/content/images/step-by-step-chrome-extensions-tutorial-building-for-the-2025-manifest-v3-era/featured.webp" alt="Step-by-Step Chrome Extensions Tutorial: Building for the 2025 Manifest V3 Era" width="1200" height="630" loading="lazy" class="featured-image">

<p><!-- wp:image --></p>
<figure class="wp-block-image"><img src="https://extensionto.com/wp-content/uploads/2025/12/Step-by-Step-Chrome-Extensions-Tutorial-Building-for-the-2025-Manifest-V3-Era-1024x572.png" alt="Current image: Step-by-Step Chrome Extensions Tutorial: Building for the 2025 Manifest V3 Era" /></figure>
<p><!-- /wp:image --> <!-- wp:paragraph --></p>
<p>The browser isn't just a window to the web anymore; it is the operating system for modern work. As of late 2025, the Chrome extension ecosystem has shifted dramatically. With Manifest V2 officially retired and built-in browser AI taking center stage, developers need a new strategy. This <strong>chrome extensions tutorial</strong> outlines the exact steps to build secure, high-performance tools in this new environment.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Key Takeaways for 2025</h2>
<p><!-- /wp:heading --> <!-- wp:list --></p>
<ul class="wp-block-list"><!-- wp:list-item -->
<li>▶ <strong>Manifest V3 is Mandatory:</strong> Manifest V2 is dead. Development must focus entirely on Service Workers and declarative APIs.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li>▶ <strong>Side Panel is the New Popup:</strong> Persistent UI via the <code>chrome.sidePanel</code> API is now the UX standard, replacing transient popups.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li>▶ <strong>Local AI Integration:</strong> Chrome 140+ grants direct access to Gemini Nano via <code>window.ai</code> for offline LLM features.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li>▶ <strong>Strict Security Policies:</strong> Security is tighter. "Verified Uploads" and the "One Appeal" rule mean policy compliance is non-negotiable.</li>
<!-- /wp:list-item --></ul>
<p><!-- /wp:list --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">The State of the <a href="/blog/chrome-web-store-2" class="internal-link" title="Unlocking the Power of the Chrome Web Store: A Comprehensive Guide">Chrome Web Store</a> in 2025</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Understand the market before you start coding. The extension landscape has matured. While the total count hovers around 113,000 active extensions, the quality bar is higher. Google's aggressive removal of outdated Manifest V2 extensions cleared the clutter, creating opportunities for tools built on modern web standards.</p>
<p><!-- /wp:paragraph --> <!-- wp:table --></p>
<figure class="wp-block-table">
<table class="has-fixed-layout">
<thead>
<tr>
<th>Metric</th>
<th>2025 Data Points</th>
</tr>
</thead>
<tbody>
<tr>
<td>Total Active Extensions</td>
<td>~113,051</td>
</tr>
<tr>
<td>Dominant Category</td>
<td><a href="/blog/unlocking-productivity-the-best-chrome-extension-for-programmers-to-boost-coding-efficiency-mmtm0gk4vfm" class="internal-link" title="Unlocking Productivity: The Best Chrome Extension for Programmers to Boost Coding Efficiency">Productivity</a> (46.8%)</td>
</tr>
<tr>
<td>Avg. Review Time</td>
<td>48&ndash;72 Hours</td>
</tr>
<tr>
<td>Manifest V3 Adoption</td>
<td>100% (Mandatory)</td>
</tr>
</tbody>
</table>
</figure>
<p><!-- /wp:table --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 1: Setting Up Your Environment</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>This <strong>chrome extensions tutorial</strong> focuses on the modern stack. While you can use a basic text editor, professional developers in 2025 use frameworks to manage Manifest V3 nuances. Tools like <strong>WXT</strong> or <strong>Plasmo</strong> are standard. They provide Hot Module Replacement (HMR), allowing you to see changes instantly without manual reloads.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">Prerequisites</h3>
<p><!-- /wp:heading --> <!-- wp:list --></p>
<ul class="wp-block-list"><!-- wp:list-item -->
<li><strong>Node.js (v20+):</strong> Essential for modern build tools.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Google Chrome (v130+):</strong> Required to access the latest APIs.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Basic JavaScript/TypeScript:</strong> TypeScript is recommended for managing complex Chrome API types.</li>
<!-- /wp:list-item --></ul>
<p><!-- /wp:list --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 2: <a href="/blog/cors-chrome-7" class="internal-link" title="Understanding CORS Chrome: A Comprehensive Guide to Web Development">Understanding</a> the Manifest.json</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>The <code>manifest.json</code> file is your project's command center. It dictates what the extension does, the permissions it requires, and which files execute. Manifest V3 locks this file down significantly to prioritize user privacy.</p>
<p><!-- /wp:paragraph --> <!-- wp:preformatted --></p>
<pre class="wp-block-preformatted">{
  "manifest_version": 3,
  "name": "2025 AI Assistant",
  "version": "1.0.0",
  "description": "A modern extension using Gemini Nano.",
  "permissions": ["sidePanel", "storage", "aiLanguageModelOriginTrial"],
  "action": {
    "default_title": "Open Assistant"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
</pre>
<p><!-- /wp:preformatted --> <!-- wp:paragraph --></p>
<p><strong>Crucial Change:</strong> The <code>background.service_worker</code> is the critical shift. Manifest V2 used persistent background pages that consumed memory indefinitely. Manifest V3 uses ephemeral Service Workers. They wake on events and sleep when idle. This represents the biggest stumbling block for developers migrating from older tutorials.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 3: Building the User Interface (Side Panel API)</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Popups were the old standard, but they vanish when a user clicks away. In 2025, the <strong>Side Panel API</strong> is the superior choice. It creates a persistent UI that remains visible as the user navigates between tabs, offering a smoother workflow.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">Step 1: Creating the Side Panel HTML</h3>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Create a file named <code>sidepanel.html</code>. We will use Tailwind CSS via CDN here for simplicity.</p>
<p><!-- /wp:paragraph --> <!-- wp:preformatted --></p>
<pre class="wp-block-preformatted">&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
    &lt;script src="https://cdn.tailwindcss.com"&gt;&lt;/script&gt;
&lt;/head&gt;
&lt;body class="bg-slate-50 p-4"&gt;
    &lt;h1 class="text-xl font-bold text-indigo-600"&gt;AI Assistant&lt;/h1&gt;
    &lt;div id="response" class="mt-4 p-3 bg-white border rounded shadow-sm min-h-[100px]"&gt;
        Waiting for input...
    &lt;/div&gt;
    &lt;button id="analyze-btn" class="mt-4 w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"&gt;
        Analyze Page
    &lt;/button&gt;
    &lt;script src="sidepanel.js"&gt;&lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;
</pre>
<p><!-- /wp:preformatted --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 4: Implementing the Service Worker</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>The Service Worker acts as the orchestrator. Since it lacks direct access to the DOM, it communicates with the side panel and content scripts via <strong>Message Passing</strong>. This pattern is the backbone of any reliable extension.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">The background.js Logic</h3>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>This script listens for the extension icon click and ensures the side panel triggers correctly.</p>
<p><!-- /wp:paragraph --> <!-- wp:preformatted --></p>
<pre class="wp-block-preformatted">chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) =&gt; console.error(error));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) =&gt; {
  if (message.type === 'PROCESS_DATA') {
    // Handle heavy logic here
    console.log("Processing data from content script...");
    sendResponse({ status: 'success' });
  }
});
</pre>
<p><!-- /wp:preformatted --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 5: Leveraging Chrome&rsquo;s Built-in AI (Gemini Nano)</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>The standout feature of 2025 is the <strong>Prompt API</strong>. Chrome now ships with a local version of Gemini Nano. You can build AI tools without costly API keys or privacy concerns, as the data processing stays on the device.</p>
<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>
<p>Note: Currently, this feature requires the "AI Prototyping" flag enabled or participation in the Chrome Origin Trial.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">Implementing Local Summarization</h3>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Inside your <code>sidepanel.js</code>, call the local model directly:</p>
<p><!-- /wp:paragraph --> <!-- wp:preformatted --></p>
<pre class="wp-block-preformatted">document.getElementById('analyze-btn').addEventListener('click', async () =&gt; {
    const responseDiv = document.getElementById('response');
    responseDiv.innerText = "Thinking...";

    try {
        const session = await window.ai.languageModel.create();
        const result = await session.prompt("Summarize the current webpage content.");
        responseDiv.innerText = result;
    } catch (e) {
        responseDiv.innerText = "Error: " + e.message;
        console.error("AI Model failed", e);
    }
});
</pre>
<p><!-- /wp:preformatted --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 6: Content Scripts and the Shadow DOM</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Injecting UI directly into a website (like a "Summarize" button on Medium) requires <strong>Content Scripts</strong>. However, complex host site CSS can easily break your styling.</p>
<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>
<p>The professional solution is the <strong>Shadow DOM</strong>. By creating a Shadow Root, you isolate your extension's CSS from the website's styles, ensuring your UI looks consistent everywhere.</p>
<p><!-- /wp:paragraph --> <!-- wp:list --></p>
<ul class="wp-block-list"><!-- wp:list-item -->
<li><strong>Expert Tip:</strong> Prefer <code>chrome.scripting.executeScript</code> for dynamic injection instead of declaring everything in the manifest. This improves performance and keeps your extension's memory footprint low.</li>
<!-- /wp:list-item --></ul>
<p><!-- /wp:list --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 7: Debugging and Testing</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Debugging extensions differs from standard web development because you must monitor three separate contexts:</p>
<p><!-- /wp:paragraph --> <!-- wp:table --></p>
<figure class="wp-block-table">
<table class="has-fixed-layout">
<thead>
<tr>
<th>Context</th>
<th>How to Debug</th>
<th>Common Issues</th>
</tr>
</thead>
<tbody>
<tr>
<td>Service Worker</td>
<td>Click "service worker" link in <code>chrome://extensions</code></td>
<td>Worker going idle; global variables lost.</td>
</tr>
<tr>
<td>Popup/Side Panel</td>
<td>Right-click the UI and select "Inspect"</td>
<td>CSS conflicts; script load order errors.</td>
</tr>
<tr>
<td>Content Script</td>
<td>Standard F12 DevTools on the target website</td>
<td>CORS errors; DOM not ready.</td>
</tr>
</tbody>
</table>
</figure>
<p><!-- /wp:table --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Phase 8: Publishing to the Chrome Web Store</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>The review process is rigorous. Google strictly forbids <strong>Remote Hosted Code</strong>. All logic must reside within the extension package.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">The 2025 Checklist for Approval</h3>
<p><!-- /wp:heading --> <!-- wp:list --></p>
<ul class="wp-block-list"><!-- wp:list-item -->
<li><strong>Privacy Policy:</strong> A hosted privacy policy is mandatory, even if you don't collect data.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Justification of Permissions:</strong> You must explain <em>why</em> you need each permission in the developer console (e.g., explaining the need for <code>storage</code>).</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Two-Factor Authentication:</strong> Required for all developer accounts to prevent supply-chain attacks.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Icon Assets:</strong> Prepare 16x16, 48x48, and 128x128 PNG files.</li>
<!-- /wp:list-item --></ul>
<p><!-- /wp:list --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Monetization Strategies in the Modern Era</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Google deprecated its internal payment system, necessitating third-party solutions for revenue.</p>
<p><!-- /wp:paragraph --> <!-- wp:list --></p>
<ul class="wp-block-list"><!-- wp:list-item -->
<li><strong>Stripe Integration:</strong> The most common method. Redirect users to Stripe Checkout and use a unique "Client ID" to verify subscriptions via your backend.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>ExtensionPay:</strong> A popular wrapper service that simplifies adding payments to a few lines of code.</li>
<!-- /wp:list-item --> <!-- wp:list-item -->
<li><strong>Freemium AI:</strong> Many 2025 extensions offer basic local AI features for free, requiring a subscription for "Cloud AI" (like GPT-4o or Claude 3.5) integration.</li>
<!-- /wp:list-item --></ul>
<p><!-- /wp:list --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">Warning: The "One Appeal" Rule</h3>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Google enforces a strict "One Appeal" policy. If your extension gets flagged for a serious policy violation (like malware or deceptive practices), you get one chance to argue your case. A rejected appeal often means a permanent developer account ban. <strong>Read the Program Policies before submitting.</strong></p>
<p><!-- /wp:paragraph --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Frequently Asked Questions</h2>
<p><!-- /wp:heading --> <!-- wp:heading {"level":4} --></p>
<h4 class="wp-block-heading">Can I still use Manifest V2 in 2025?</h4>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>No. Manifest V2 reached end-of-life in mid-2025. All extensions must use Manifest V3. Any tutorial suggesting otherwise is obsolete.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":4} --></p>
<h4 class="wp-block-heading">How do I store user data securely?</h4>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Use <code>chrome.storage.local</code> for general data and <code>chrome.storage.session</code> for sensitive data that should clear when the browser closes. Use <code>chrome.storage.sync</code> for cross-device syncing.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":4} --></p>
<h4 class="wp-block-heading">Does my extension work on Brave or Edge?</h4>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Yes. Brave, Microsoft Edge, and Opera run on the Chromium engine. Extensions built for Chrome work on these browsers, though slight UI differences in features like <code>chrome.sidePanel</code> may exist.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":4} --></p>
<h4 class="wp-block-heading">How do I use React or Vue in an extension?</h4>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Use a framework like <strong>Plasmo</strong>. It handles build configuration <a href="/blog/stop-video-popups-from-playing-automatically-3" class="internal-link" title="Stop Video Popups from Playing Automatically: A Comprehensive Guide">automatically</a>, allowing you to write your popup and side panel code as standard React or Vue components.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading --></p>
<h2 class="wp-block-heading">Conclusion</h2>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Building a Chrome extension in 2025 offers a powerful way to integrate directly into user workflows. While the shift to Manifest V3 presents technical challenges, the new APIs&mdash;specifically the <strong>Side Panel</strong> and <strong>Built-in AI</strong>&mdash;allow for deeper functionality than ever before.</p>
<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>
<p>Follow this <strong>chrome extensions tutorial</strong> to move beyond the basics. Success in the current ecosystem requires focusing on performance (via Service Workers), maintaining a persistent user experience (via Side Panels), and utilizing local machine learning. Start small, test across different Chromium browsers, and prioritize privacy.</p>
<p><!-- /wp:paragraph --> <!-- wp:heading {"level":3} --></p>
<h3 class="wp-block-heading">Ready to start building?</h3>
<p><!-- /wp:heading --> <!-- wp:paragraph --></p>
<p>Open your terminal and run <code>npm create wxt@latest</code> to begin.<a href="https://developer.chrome.com/docs/extensions/mv3/intro/">View Official </a><a href="/blog/screenshot-tool-for-chrome-5" class="internal-link" title="Unlock the Power of Visual Documentation: The Ultimate Screenshot Tool for Chrome">Documentation</a></p>
<p><!-- /wp:paragraph --> <!-- wp:paragraph --></p>
<p>&nbsp;</p>
<p><!-- /wp:paragraph --></p>
