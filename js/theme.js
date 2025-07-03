document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const historyIcon = document.getElementById('history-icon');

    /* HISTORY */
    const historyBtn = document.getElementById('history-btn');
    historyBtn.addEventListener('click', () => {
        chrome.tabs.create({url: chrome.runtime.getURL('history.html')});
    });

    chrome.storage.local.get(['theme'], (result) => {
        const savedTheme = result.theme || 'light';
        applyTheme(savedTheme);
    });

    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        chrome.storage.local.set({theme: newTheme});
    });

    function applyTheme(theme) {
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);

        themeIcon.src = theme === 'light' ? 'icons/icon-theme-dark.png' : 'icons/icon-theme-light.png';
        historyIcon.src = theme === 'light' ? 'icons/icon-history-dark.png' : 'icons/icon-history-light.png';
    }
});
