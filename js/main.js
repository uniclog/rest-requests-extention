let templates = [];
let originalResponse = '';

document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();
    document.getElementById('save-template').addEventListener('click', saveTemplate);
    document.getElementById('delete-template').addEventListener('click', deleteTemplate);
    document.getElementById('add-header').addEventListener('click', () => addHeader());
    document.getElementById('send-request').addEventListener('click', sendRequest);
    document.getElementById('select-template').addEventListener('change', getTemplate);
    document.getElementById('toggle-body-button').addEventListener('click', showBodyContainer);
    document.getElementById('format-toggle').addEventListener('change', (e) => formatResponse(e));
    document.getElementById('wrap-toggle').addEventListener('change', (e) => wrapFunc(e));
});

function loadTemplates() {
    chrome.storage.local.get('templates', (result) => {
        templates = result.templates || [];
        const templateSelect = document.getElementById('select-template');
        templateSelect.innerHTML = '<option value="">Select template</option>';

        templates = templates.filter(item => item !== null);
        templates.forEach((template, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = template.id;
            templateSelect.appendChild(option);
        });
    });
}

function saveTemplate() {
    const selected = document.getElementById('select-template').value;
    const nameInput = document.getElementById('name');
    const urlInput = document.getElementById('url');
    const methodSelect = document.getElementById('method');
    const headersContainer = document.getElementById('headers');
    const bodyInput = document.getElementById('body');

    const name = nameInput.value;
    const url = urlInput.value.trim();
    const method = methodSelect.value;
    const body = bodyInput.value;

    if (!url) {
        showStatus('URL is required!', 1);
        return;
    }

    const headers = {};
    headersContainer.querySelectorAll('.header-row').forEach(row => {
        const key = row.querySelector('.header-key').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        if (key) headers[key] = value;
    });

    let id = `${method} ${url}`;
    if (name && name !== '') {
        id = `${name}`;
    }

    const existingIndex = selected === '' ? -1 : templates.findIndex(t => t.id === id);

    const templateData = {id, name, url, method, headers, body};

    if (existingIndex >= 0) {
        templates[existingIndex] = templateData;
        showStatus('Template updated successfully!', 0);
    } else {
        templates.push(templateData);
        showStatus('Template saved successfully!', 0);
    }

    chrome.storage.local.set({templates}, () => {
        loadTemplates();
    });
    clearTemplate(0);
}

function deleteTemplate() {
    const selectedTemplate = document.getElementById('select-template').value;

    if (!selectedTemplate) {
        showStatus('No template selected.', 1);
        return;
    }

    chrome.storage.local.get({templates: {}}, result => {
        const templates = result.templates;

        delete templates[selectedTemplate];
        templates.splice(0, templates.length, ...templates.filter(item => item != null));

        chrome.storage.local.set({'templates': templates}, () => {
            loadTemplates();
            clearTemplate();
            showStatus('Template deleted successfully', 0);
        });
    });
}

function addHeader(key = '', value = '') {
    const headersContainer = document.getElementById('headers');
    const row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML = `
    <input type="text" class="header-key" placeholder="Key" value="${key}">
    <input type="text" class="header-value" placeholder="Value" value="${value}">
    <button class="remove-header" type="button" title="Remove">×</button>
  `;

    headersContainer.appendChild(row);

    row.querySelector('.remove-header').addEventListener('click', () => {
        row.remove();
    });
}

/**
 * отправление запроса
 */
async function sendRequest() {
    const url = document.getElementById('url').value.trim();
    const method = document.getElementById('method').value;
    const body = document.getElementById('body').value;

    if (!url) {
        showStatus('URL is required!', 1);
        return;
    }

    const headers = {};
    document.querySelectorAll('.header-row').forEach(row => {
        const key = row.querySelector('.header-key').value.trim();
        const value = row.querySelector('.header-value').value.trim();
        if (key) headers[key] = value;
    });

    fetch(url, {
        method,
        headers,
        body: method === 'GET' || method === 'HEAD' ? undefined : body,
    })
        .then(async response => {
            const text = await response.text();
            showStatus(`Status: ${response.status}`, response.ok ? 0 : 1);
            showResponse(text);
            let rh = showResponseHeaders(response.headers);
            saveRequestToHistory({
                method, url, response: text, requestHeaders: headers, responseHeaders: rh, status: response.status
            });
        })
        .catch(error => {
            showStatus('Request failed: ' + error.message, 1);
            showResponse('');
            saveRequestToHistory({
                method, url, requestHeaders: headers, status: error.status, error: error.message
            });
        });
}

function saveRequestToHistory(request) {
    chrome.storage.local.get(['requestHistory'], (result) => {
        const history = result.requestHistory || [];
        history.unshift(request); // добавляем в начало
        if (history.length > 50) history.pop(); // храним не более 50 запросов
        chrome.storage.local.set({requestHistory: history});
    });
}

function showResponseHeaders(headers) {
    let headerText = '';
    headers.forEach((value, key) => {
        headerText += `${key}: ${value}\n`;
    });

    document.getElementById('response-headers').textContent = headerText;
    return headerText;
}

function showBodyContainer() {
    const bodyContainer = document.getElementById('body-container');
    const toggleButton = document.getElementById('toggle-body-button');

    if (bodyContainer.style.display === 'none') {
        bodyContainer.style.display = 'block';
        toggleButton.textContent = 'Hide Body';
    } else {
        bodyContainer.style.display = 'none';
        toggleButton.textContent = 'Show Body';
    }
}

function getTemplate(event) {
    const selectedIndex = event.target.value;
    if (selectedIndex === '') {
        clearTemplate();
        return;
    }
    const template = templates[selectedIndex];
    document.getElementById('name').value = template.name || '';
    document.getElementById('url').value = template.url || '';
    document.getElementById('method').value = template.method || '';
    document.getElementById('body').value = template.body || '';

    const headersContainer = document.getElementById('headers');
    headersContainer.innerHTML = '';
    for (const key in template.headers) {
        addHeader(key, template.headers[key]);
    }
}

function showResponse(responseText) {
    const responseContainer = document.getElementById('response-container');
    const responseElement = document.getElementById('response');
    const format = document.getElementById('format-toggle');

    originalResponse = responseText;

    if (responseText && responseText.trim() !== '') {
        if (format.checked && isJSON(responseText)) {
            responseElement.textContent = formatJSON(responseText);
        } else if (format.checked && isHTML(responseText)) {
            responseElement.textContent = formatHTML(responseText);
        } else {
            responseElement.textContent = responseText;
        }
        responseContainer.style.display = 'block';
    } else {
        responseElement.textContent = '';
        responseContainer.style.display = 'none';
    }
}

function wrapFunc(event) {
    const responseField = document.getElementById('response');
    if (event.target.checked) {
        responseField.setAttribute('wrap', 'soft');  // Включаем перенос
        responseField.style.overflowX = 'hidden';
    } else {
        responseField.setAttribute('wrap', 'off');  // Отключаем перенос
        responseField.style.overflowX = 'auto';
    }
}

function formatResponse(event) {
    const responseElement = document.getElementById('response');

    if (event.target.checked) {
        if (isJSON(originalResponse)) {
            responseElement.textContent = formatJSON(originalResponse);
        } else if (isHTML(originalResponse)) {
            responseElement.textContent = formatHTML(originalResponse);
        }
    } else {
        responseElement.textContent = originalResponse;
    }
}

function formatJSON(str) {
    return JSON.stringify(JSON.parse(str), null, 2); // Красивый формат
}

function isHTML(str) {
    const pattern = /<\/?[a-z][\s\S]*>/i;
    return pattern.test(str.trim());
}

function formatHTML(html) {
    let tab = 0;
    let result = '';
    html.split(/>\s*</).forEach(function (element) {
        if (element.match(/^\/\w/)) tab = Math.max(tab - 1, 0);
        result += '  '.repeat(tab) + '<' + element + '>\n';
        if (element.match(/^<?\w[^>]*[^\/]$/)) tab++;
    });
    return result.trim();
}

function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

function showStatus(message, level = 0) {
    const statusEl = document.getElementById('status');
    statusEl.classList.remove('status-default', 'status-error', 'status-warning', 'hidden');

    switch (level) {
        case 1:
            statusEl.classList.add('status-error');
            break;
        case 2:
            statusEl.classList.add('status-warning');
            break;
        default:
            statusEl.classList.add('status-default');
    }

    statusEl.textContent = message;
    statusEl.style.opacity = '1';

    setTimeout(() => {
        statusEl.style.opacity = '0';
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 400);
    }, 3000);
}

function clearTemplate(logs = 1) {
    document.getElementById('name').value = '';
    document.getElementById('select-template').value = '';
    document.getElementById('method').value = 'GET';
    document.getElementById('url').value = '';
    document.getElementById('body').value = '';

    const headersContainer = document.getElementById('headers');
    headersContainer.innerHTML = '';

    const responseContainer = document.getElementById('response-container');
    responseContainer.style.display = 'none';

    if (logs === 1) {
        showStatus('Form cleared', 0);
    }
}

