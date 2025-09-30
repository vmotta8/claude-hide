const projectChatUUIDs = new Set();

// Fetches chats from API and identifies which belong to projects
async function fetchProjectChats() {
  try {
    // Discover the organization ID
    let orgId = null;

    const urlMatch = window.location.href.match(/organizations?\/([a-f0-9-]+)/i);
    if (urlMatch) {
      orgId = urlMatch[1];
    } else {
      const orgsResponse = await fetch('https://claude.ai/api/organizations');
      const orgs = await orgsResponse.json();
      if (Array.isArray(orgs) && orgs[0]?.uuid) {
        orgId = orgs[0].uuid;
      }
    }

    if (!orgId) return;

    // Fetch the chats
    const response = await fetch(
      `https://claude.ai/api/organizations/${orgId}/chat_conversations?limit=100&starred=false`
    );
    const data = await response.json();

    if (!Array.isArray(data)) return;

    // Identify project chats
    projectChatUUIDs.clear();
    data.forEach(chat => {
      if (chat.project_uuid) {
        projectChatUUIDs.add(chat.uuid);
      }
    });

    // Hide the chats
    setTimeout(hideProjectChats, 100);
  } catch (e) {
    console.error('[Claude Hide Chats] Error:', e);
  }
}

// Hides/shows project chats based on configuration
function hideProjectChats() {
  chrome.storage.sync.get(['hideProjectChats'], function(result) {
    const isEnabled = result.hideProjectChats !== false;
    const chatLinks = document.querySelectorAll('a[href^="/chat/"]');

    chatLinks.forEach(link => {
      const chatUUID = link.getAttribute('href').replace('/chat/', '');
      const chatItem = link.closest('li');

      if (chatItem && projectChatUUIDs.has(chatUUID)) {
        chatItem.style.display = isEnabled ? 'none' : '';
      }
    });
  });
}

// Intercepts future requests to update the list
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);

  try {
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;

    if (url.includes('/chat_conversations')) {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();

      if (Array.isArray(data)) {
        projectChatUUIDs.clear();
        data.forEach(chat => {
          if (chat.project_uuid) projectChatUUIDs.add(chat.uuid);
        });
        setTimeout(hideProjectChats, 100);
      }
    }
  } catch (e) {}

  return response;
};

// Observes DOM changes to reapply when new chats appear
const observer = new MutationObserver(() => hideProjectChats());

// Starts the observer when the sidebar is ready
async function startObserver() {
  const sidebar = document.querySelector('[role="complementary"]') ||
                  document.querySelector('aside') ||
                  document.querySelector('nav');

  if (sidebar) {
    observer.observe(sidebar, { childList: true, subtree: true });
    await fetchProjectChats();
  } else {
    setTimeout(startObserver, 500);
  }
}

// Starts when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startObserver);
} else {
  startObserver();
}

// Reapplies when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.hideProjectChats) hideProjectChats();
});
