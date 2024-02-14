let menuFocusedIndex = 0;  // element index
let menuEntryPadding = 1;
let menuSchema = {};
let topWindow = '';
let nestedFocusedIndex = 0;
let nestedPrefix = '';

let THEME = new URLSearchParams(window.location.search).get('theme');

function max(a, b) {
    return (a > b) ? a : b;
}
function min(a, b) {
    return (a < b) ? a : b;
}
function menuFocusIndex(i) {
    let entries = document.querySelector('#menu').children;
    let num_entries = menuSchema.cards.length;
    console.assert(menuEntryPadding*2 + menuSchema.cards.length ==
        entries.length);
    menuFocusedIndex = i;
    menuFocusedIndex = max(menuFocusedIndex, menuEntryPadding);
    menuFocusedIndex = min(menuFocusedIndex, num_entries);

    let entry = entries[menuFocusedIndex];
    console.log(menuFocusedIndex, '->', entry);
    entry.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
    });
    let title = document.querySelector('#menu_title');
    title.innerText = menuSchema.cards[
        menuFocusedIndex - menuEntryPadding][0];
}

function selectedEntry() {
    let menu_index = menuFocusedIndex - menuEntryPadding;
    let elements = document.querySelector('#menu').children;
    return {
        menuCard: menuSchema.cards[menu_index],
        entry: elements[menuFocusedIndex]
    };
}

function show(elem) {
    elem.style.display = '';
}
function hide(elem) {
    elem.style.display = 'none';
}

function selectNested() {
    let entries = document.querySelector('#nested_container').children;
    nestedFocusedIndex = min(
        entries.length-1,
        max(0, nestedFocusedIndex));
    let focused = document.querySelectorAll('#nested_entry_focused');
    if (focused.length > 0) {
        focused[0].id = '';
    }
    entries[nestedFocusedIndex].id = 'nested_entry_focused';
    entries[nestedFocusedIndex].scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
    });
}

function buildNested(elem, response) {
    let entries = response.entries;
    nestedPrefix = response.prefix;
    elem.innerHTML = '';
    nestedFocusedIndex = 0;

    let div = document.createElement('div');
    div.id = 'nested_container';
    for (let i = 0; i < entries.length; i++) {
        let entry = document.createElement('div');
        entry.className = 'nested_entry';
        entry.innerText = entries[i];
        div.appendChild(entry);
    }
    
    elem.appendChild(div);
    selectNested();
}

function ajax(url, cb) {
    let xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {cb(xhr);});
    xhr.open('GET', url);
    xhr.send();
}
function selectButton(i) {
    let selection = selectedEntry();
    let card = document.querySelector('#card');
      
    let btn = selection.menuCard[1];
    request(`menu/${btn}`);
}

function request(path) {
    let card = document.querySelector('#card');
    ajax(path, function(xhr) {
        let resp = JSON.parse(xhr.response);
        switch(resp.type) {
            case "nested":
                buildNested(card, resp);
                show(card);
                topWindow = 'nested';
                break;
            case "temp":
                card.innerText = resp.value;
                topWindow = 'card';
                setTimeout(function() {
                    hide(card);
                    topWindow = '';
                }, 3000);
                break;
            case "close":
                // menus used only for an action, so the window
                // will close after selecting.
                window.close();
                
        }
    });
}

// For debounced keys, the last time the
// event was sent.
let lastTime = {};

// Keys behave in one of two ways:
// 1. time based / debounced. Only send the event
// if we havent sent the event for some time.
// 2. Press based. Only send the event when the document
// has been focused and observed a 0->1 transition.
// Keys default to behavior 1. Keys use behavior
// 2 if added to press_only_keys.
let press_only_keys = {'Enter': 1};
let lastVal = {};
function clearKeys() {
    Object.keys(lastVal).forEach(function(k) {
        delete lastVal[k];
    });
}

function pad_key(ev) {
    const timeout = 200;  // repeat delay ms
    const focusTime = 1000;
    let now = Date.now();
    if (!document.hasFocus()) {
        clearKeys();
        return;
    }
    if (ev.key in press_only_keys) {
        // 0->1 transition while focused only.
        if (lastVal[ev.key] == 0 && ev.value == 1) {
            on_key(ev);
        }
        lastVal[ev.key] = ev.value;
    } else {
        // debounce key input. Events will only be sent if the
        // we havent sent this event recently.
        let prev = lastTime[ev.key] || 0;
        if (now - prev > timeout) {
            on_key(ev);
            lastTime[ev.key] = now;
        }
    }
}

function pad_mapped(gamepad, buttons) {
    // Given a mapping of gamepad_button -> Canonical name,
    // dispatch the key event.

    Object.keys(buttons).forEach(function(k) {
        let mapped = buttons[k];
        let val = gamepad.buttons[k].value;
        if (val > 0 || mapped in press_only_keys) {
            pad_key({
                key: mapped,
                value: val,
            });
        }
    });
}
function pad_xbox(pad) {
    const buttons = {
        // 0 = a -> enter
        // 1 = b -> escape
        // 9 = start
        // 12 = dpad u-> w
        // 13 = dpad d->s
        // 14 = dpad l->a
        // 15 = dpad r->d
        0: 'Enter',
        1: 'Escape',
        12: 'w',
        13: 's',
        14: 'a',
        15: 'd',
    };
    pad_mapped(pad, buttons);
}
function pad_ps(pad) {
    const buttons = {
        // 0 = x -> enter
        // 3 = triangle -> escape
        // 9 = start
        // 12 = dpad u-> w
        // 13 = dpad d->s
        // 14 = dpad l->a
        // 15 = dpad r->d
        0: 'Enter',
        3: 'Escape',
        12: 'w',
        13: 's',
        14: 'a',
        15: 'd',
    };
    pad_mapped(pad, buttons);
}
function check_pad() {
    let gp = navigator.getGamepads();
    gp.forEach(function(pad) {
        if (pad == null) {
            return;
        }
        if (pad.id.indexOf("Product: 028e") != -1) {
            pad_xbox(pad);
        } else if (pad.id.indexOf("Product: 09cc") != -1) {
            pad_ps(pad);
        }
    });
    setTimeout(check_pad, 50);
}
function on_key(ev) {
    console.log('key: ', ev.key);
    let card = document.querySelector('#card');

    if (topWindow == 'card') {
        // simple text-only cards that can just be dismissed
        if (ev.key == 'Escape') {
            hide(card);
            topWindow = '';
        }
    } else if (topWindow == 'nested') {
       switch (ev.key) {
            case 'Escape':
                hide(card);
                topWindow = '';
                break;
            case 'w':
                nestedFocusedIndex--;
                selectNested();
                break;
            case 's':
                nestedFocusedIndex++;
                selectNested();
                break;
            case 'Enter':
                let elem = document.querySelector(
                    '#nested_entry_focused');
                // elements can set value if a different
                // api is desired vs display
                let stem = 
                    elem.getAttribute('value') ||
                    elem.innerText;
                let path = `${nestedPrefix}/${stem}`;
                request(path);
                // reload menu just in case of update
                update_menu(false);
                break;
        }
    } else {
        switch (ev.key) {
            case 'd': 
                menuFocusIndex(++menuFocusedIndex);
                break;
            case 'a':
                menuFocusIndex(--menuFocusedIndex);
                break;
            case 'Enter':
                selectButton(menuFocusedIndex);
                break;
        }
    }
}

function min(a, b) {
    return (a < b) ? a : b;
}
function times(n, f) {
    for(let i = 0; i < n; i++) {
        f();
    }
}

function initMenu(schema) {
    menuSchema = schema;
    let menu = document.querySelector('#menu');
    menu.innerHTML = '';
    times(menuEntryPadding, function() {
        let div = document.createElement('div');
        div.className = 'entry hidden';
        menu.appendChild(div);
    });

    schema.cards.forEach(function(c) {
        let div = document.createElement('div');
        div.className = 'entry';
        let text = c[0];
        let bg = c[2];
        // div.innerText = text;
        div.style = `background-image: url("${bg}");`;
        menu.appendChild(div);
    });

    times(menuEntryPadding, function() {
        let div = document.createElement('div');
        div.className = 'entry hidden';
        menu.appendChild(div);
    });
}

function update_menu(zero) {
    ajax('/menu.json', function(xhr) {
        let json = JSON.parse(xhr.response);
        initMenu(json);
        if (zero) {
            menuFocusedIndex = 0;
        }
        menuFocusIndex(menuFocusedIndex);
    });
}

function handlers() {
    document.addEventListener('keydown', on_key);
    check_pad();
}

function menu_load() {
    console.log('load');

    handlers();

    // static setup for theming demo
    initMenu({
        // display, api name, image
        cards: [
            ['Files', 'files', `../${THEME}/files.png`],
            ['Power', 'power', `../${THEME}/power.png`],
            ['System Information', 'info', `../${THEME}/info.png`],
        ]
    });
    menuFocusIndex(0);
}

function pause() {
    // onload for pause
    let card = document.querySelector('#card');
    buildNested(card, {
        prefix: window.location.pathname,
        entries: [
            'resume',
            'quit'
        ]
    });
    topWindow = 'nested';
    handlers();
}
