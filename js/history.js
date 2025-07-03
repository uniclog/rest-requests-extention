document.addEventListener('DOMContentLoaded', () => {
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    const refreshHistoryBtn = document.getElementById('refresh-history-btn');
    const refreshTemplatesBtn = document.getElementById('refresh-templates-btn');

    const historyList = document.getElementById('history-list');
    const templatesList = document.getElementById('templates-list');

    loadHistory();
    loadTemplates();

    clearHistoryBtn.addEventListener('click', () => {
        chrome.storage.local.remove('requestHistory', () => {
            historyList.innerHTML = '<p>History cleared.</p>';
        });
    });
    refreshHistoryBtn.addEventListener('click', loadHistory);
    historyList.addEventListener('click', (e) => details(e));
    templatesList.addEventListener('click', (e) => details(e));
    refreshTemplatesBtn.addEventListener('click', loadTemplates);

    function loadHistory() {
        historyList.innerHTML = '';

        chrome.storage.local.get(['requestHistory'], (result) => {
            const history = result.requestHistory || [];
            if (history.length === 0) {
                historyList.innerHTML = '<p>No request history yet.</p>';
                return;
            }

            function checkStatus(status) {
                if(status) {
                    return status < 200 || status > 299
                }
                return true;
            }

            history.forEach((item, index) => {
                const entry = document.createElement('div');
                entry.className = 'history-entry';
                entry.innerHTML = `
                <div class="history-summary" data-index="${index}">
                    <div><strong ${checkStatus(item.status) ? `style="color:#e74c3c"` : ''}>${item.method}</strong> ${item.url}</div> 
                </div>
                <div class="history-details hidden">  
                    ${item.status ? `
                       <p>Status: ${item.status}</p><br />
                    ` : ''}
                    ${item.error ? `
                        <p>Error message:</p>
                        <pre>${item.error}</pre>
                    ` : ''}
                    ${item.requestHeaders && formatHeaders(item.requestHeaders) !== '' ? `
                        <p>Request Headers:</p>
                        <pre>${formatHeaders(item.requestHeaders)}</pre>
                    ` : ''}
                    ${item.responseHeaders ? `
                        <p>Response Headers:</p>
                        <pre>${item.responseHeaders}</pre>
                    ` : ''}
                    ${item.response ? `
                        <p>Response Body:</p>
                        <textarea readonly>${escapeHTML(item.response)}</textarea>` : ''
                } 
                </div>
            `;
                historyList.appendChild(entry);
            });
        });
    }

    function loadTemplates() {
        chrome.storage.local.get(['templates'], (result) => {
            const templates = result.templates || [];

            templates.forEach((item, index) => {
                const entry = document.createElement('div');
                entry.className = 'history-entry';
                entry.innerHTML = `
                <div class="history-summary" data-index="${index}">
                    <div><strong>${item.method}</strong>${item.name} - ${item.url}</div> 
                </div>
                <div class="history-details hidden">
                    <p>Template Name:</p>
                    ${item.name ? `
                        <pre>${item.name}</pre><br />
                    ` : `${item.name} - ${item.url}<br />`} 
                    ${item.headers && formatHeaders(item.headers) !== '' ? `
                        <p>Request Headers:</p>
                        <pre>${formatHeaders(item.headers)}</pre>
                    ` : ''}
                    ${item.body ? `
                        <p>Request Body:</p>
                        <textarea readonly>${item.body}</textarea>
                    ` : ''}
                </div>
            `;

                const detailsElement = entry.querySelector('.history-details');

                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Delete';
                deleteButton.className = 'history-actions-drop';
                deleteButton.addEventListener('click', () => {
                    templates.splice(index, 1);
                    chrome.storage.local.set({templates}, () => {
                        entry.remove();
                    });
                });
                detailsElement.appendChild(deleteButton);

                templatesList.appendChild(entry);
            });
        });
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});

function details(e) {
    /*const entry = e.target.closest('.history-entry');
    if (!entry) return;
    const detailsElement = entry.querySelector('.history-details');
    if (detailsElement) {
        detailsElement.classList.toggle('hidden');
    }*/
    const summary = e.target.closest('.history-summary');
    if (summary) {
        const details = summary.nextElementSibling;
        details.classList.toggle('hidden');
    }
}

function formatHeaders(headers) {
    if (!headers) return 'No headers';
    return Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});


/////////////////////////////////
// EXPORT / IMPORT
/////////////////////////////////
document.getElementById('export-templates').addEventListener('click', exportTemplates);
document.getElementById('import-templates').addEventListener('click', () => {
    document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', importTemplates);

function exportTemplates() {
    chrome.storage.local.get(['templates'], (result) => {
        const templates = result.templates || {};
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "templates.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
    });
}

function importTemplates(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTemplates = JSON.parse(e.target.result);
            if (typeof importedTemplates !== 'object') {
                alert('Invalid file format.');
                return;
            }
            chrome.storage.local.set({ templates: importedTemplates }, () => {
                alert('Templates imported successfully!');
                location.reload();
            });
        } catch (err) {
            alert('Error parsing JSON file.');
        }
    };
    reader.readAsText(file);
}





