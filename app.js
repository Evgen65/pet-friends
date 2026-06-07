'use strict';

// ===== STORAGE =====

const KEYS = {
    found:   'pf_found',
    lost:    'pf_lost',
    forHome: 'pf_forHome',
    adopt:   'pf_adopt',
    stories: 'pf_stories',
    seeded:  'pf_seeded',
};

function load(key) {
    try { return JSON.parse(localStorage.getItem(KEYS[key]) || '[]'); }
    catch { return []; }
}

function save(key, data) {
    localStorage.setItem(KEYS[key], JSON.stringify(data));
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===== I18N =====

const LANG_KEY     = 'petFriendsLanguage';
const DEFAULT_LANG = 'en';

const TRANSLATIONS = {
    en: {
        'nav.home':    'Home',
        'nav.found':   'Found Pets',
        'nav.lost':    'Lost Pets',
        'nav.forHome': 'Pets for Home',
        'nav.adopt':   'I Want to Adopt',
        'nav.stories': 'Pet Stories',
        'nav.contact': 'Contact',

        'home.hero.title': 'Welcome to Pet Friends',
        'home.hero.text':  'A community platform connecting animal lovers. Whether you found a stray, lost your pet, or want to give or find a loving home — you\'re in the right place.',

        'home.card.found.title': 'I Found a Pet',
        'home.card.found.text':  'Found a lost or stray animal? Post a listing so the owner can find their companion.',
        'home.card.found.btn':   'Go to Found Pets',
        'home.card.lost.title':  'I Lost My Pet',
        'home.card.lost.text':   'Lost your furry friend? Post a listing with details to help bring them home.',
        'home.card.lost.btn':    'Go to Lost Pets',
        'home.card.forHome.title': 'Pet Looking for Home',
        'home.card.forHome.text':  'Have a pet that needs a new loving home? Post their story and find the perfect family.',
        'home.card.forHome.btn':   'Pets for Adoption',
        'home.card.adopt.title': 'I Want to Adopt',
        'home.card.adopt.text':  'Ready to welcome a new family member? Browse pets or post your adoption request.',
        'home.card.adopt.btn':   'I Want to Adopt',

        'stat.found':   'Found Pets',
        'stat.lost':    'Lost Pets',
        'stat.forHome': 'For Adoption',
        'stat.adopt':   'Adopt Requests',
        'stat.stories': 'Pet Stories',

        'section.found.title':   '🔍 Found Pets',
        'section.found.sub':     'Browse pets that have been found. Is one of them yours?',
        'section.lost.title':    '😢 Lost Pets',
        'section.lost.sub':      'Help reunite lost pets with their owners. Have you seen any of these animals?',
        'section.forHome.title': '🏠 Pets Looking for a Home',
        'section.forHome.sub':   'These wonderful animals are looking for their forever homes. Could you be the one?',
        'section.adopt.title':   '❤️ I Want to Adopt',
        'section.adopt.sub':     'Post your adoption request and let pets find you. Or browse open adoption requests.',
        'section.stories.title': '📖 Pet Stories',
        'section.stories.sub':   'Share your funny, touching, or useful pet stories!',
        'section.contact.title': '📬 Contact Us',
        'section.contact.sub':   'Have a question or suggestion? We\'d love to hear from you!',

        'btn.post.found':   '+ Post Found Pet',
        'btn.post.lost':    '+ Report Lost Pet',
        'btn.post.forHome': '+ Add Pet for Adoption',
        'btn.post.adopt':   '+ Post Adoption Request',
        'btn.post.stories': '+ Share a Story',

        'footer': '🐾 Pet Friends — A community for animal lovers | Practice website for QA students',

        'filter.allTypes':      'All Types',
        'filter.allCities':     'All Cities',
        'filter.allStatuses':   'All Statuses',
        'filter.allCategories': 'All Categories',

        'type.Cat':   'Cat',
        'type.Dog':   'Dog',
        'type.Bird':  'Bird',
        'type.Other': 'Other',

        'status.Open':      'Open',
        'status.Resolved':  'Resolved',
        'status.Available': 'Available',
        'status.Adopted':   'Adopted',
        'status.Matched':   'Matched',

        'cat.Funny':    'Funny',
        'cat.Touching': 'Touching',
        'cat.Useful':   'Useful',

        'form.selectType':     'Select type',
        'form.selectCategory': 'Select category',

        'btn.edit':   'Edit',
        'btn.delete': 'Delete',

        'btn.save.listing': 'Save Listing',
        'btn.save.request': 'Save Request',
        'btn.share.story':  'Share Story',
        'btn.send.message': 'Send Message',
        'btn.send.another': 'Send Another Message',
        'btn.cancel':       'Cancel',

        'form.add.found':    'Post a Found Pet',
        'form.add.lost':     'Report a Lost Pet',
        'form.add.forHome':  'Post a Pet for Adoption',
        'form.add.adopt':    'Post an Adoption Request',
        'form.edit.listing': 'Edit Listing',
        'form.add.stories':  'Share a Pet Story',
        'form.edit.stories': 'Edit Story',

        'toast.listing.saved':   'Listing saved!',
        'toast.listing.updated': 'Listing updated!',
        'toast.listing.deleted': 'Listing deleted.',
        'toast.story.saved':     'Story shared!',
        'toast.story.updated':   'Story updated!',
        'toast.story.deleted':   'Story deleted.',

        'confirm.delete.listing': 'Delete this listing?',
        'confirm.delete.story':   'Delete this story?',

        'error.required': 'This field is required.',
        'error.email':    'Enter a valid email address.',

        'empty.found':   'No found pet listings yet. Be the first to post!',
        'empty.lost':    'No lost pet listings at this time.',
        'empty.forHome': 'No pets listed for adoption yet.',
        'empty.adopt':   'No adoption requests yet. Be the first to post!',
        'empty.stories': 'No stories yet. Share the first one!',

        'search.found':   'Search by name, city, description…',
        'search.lost':    'Search by name, city, description…',
        'search.forHome': 'Search by name, city, description…',
        'search.adopt':   'Search by city, description…',
        'search.stories': 'Search stories…',

        'contact.success.title': 'Message Sent!',
        'contact.success.text':  'Thank you for reaching out. We\'ll get back to you within 2 business days.',
    },

    ru: {
        'nav.home':    'Главная',
        'nav.found':   'Найденные питомцы',
        'nav.lost':    'Потерянные питомцы',
        'nav.forHome': 'В добрые руки',
        'nav.adopt':   'Хочу усыновить',
        'nav.stories': 'Истории',
        'nav.contact': 'Контакты',

        'home.hero.title': 'Добро пожаловать в Pet Friends',
        'home.hero.text':  'Сообщество для любителей животных. Нашли потеряшку, потеряли питомца или хотите взять животное в дом — вы в нужном месте.',

        'home.card.found.title': 'Нашёл питомца',
        'home.card.found.text':  'Нашли потерявшееся животное? Разместите объявление, чтобы хозяин мог найти своего друга.',
        'home.card.found.btn':   'Найденные питомцы',
        'home.card.lost.title':  'Потерял питомца',
        'home.card.lost.text':   'Потеряли питомца? Разместите объявление с описанием, чтобы помочь ему вернуться домой.',
        'home.card.lost.btn':    'Потерянные питомцы',
        'home.card.forHome.title': 'Питомец ищет дом',
        'home.card.forHome.text':  'Есть питомец, которому нужен новый дом? Расскажите его историю и найдите идеальную семью.',
        'home.card.forHome.btn':   'Питомцы для усыновления',
        'home.card.adopt.title': 'Хочу усыновить',
        'home.card.adopt.text':  'Готовы взять нового члена семьи? Просмотрите питомцев или разместите запрос.',
        'home.card.adopt.btn':   'Хочу усыновить',

        'stat.found':   'Найдено',
        'stat.lost':    'Потеряно',
        'stat.forHome': 'В добрые руки',
        'stat.adopt':   'Запросы на усыновление',
        'stat.stories': 'Истории',

        'section.found.title':   '🔍 Найденные питомцы',
        'section.found.sub':     'Посмотрите найденных питомцев. Может, один из них ваш?',
        'section.lost.title':    '😢 Потерянные питомцы',
        'section.lost.sub':      'Помогите воссоединить потерявшихся питомцев с хозяевами.',
        'section.forHome.title': '🏠 Питомцы ищут дом',
        'section.forHome.sub':   'Эти замечательные животные ищут свой вечный дом. Может, это вы?',
        'section.adopt.title':   '❤️ Хочу усыновить',
        'section.adopt.sub':     'Разместите запрос на усыновление или просмотрите открытые запросы.',
        'section.stories.title': '📖 Истории питомцев',
        'section.stories.sub':   'Поделитесь смешными, трогательными или полезными историями о питомцах!',
        'section.contact.title': '📬 Связаться с нами',
        'section.contact.sub':   'Есть вопрос или предложение? Мы рады вас слышать!',

        'btn.post.found':   '+ Добавить найденного питомца',
        'btn.post.lost':    '+ Сообщить о потере',
        'btn.post.forHome': '+ Добавить питомца для усыновления',
        'btn.post.adopt':   '+ Разместить запрос',
        'btn.post.stories': '+ Поделиться историей',

        'footer': '🐾 Pet Friends — Сообщество для любителей животных | Учебный сайт для QA студентов',

        'filter.allTypes':      'Все типы',
        'filter.allCities':     'Все города',
        'filter.allStatuses':   'Все статусы',
        'filter.allCategories': 'Все категории',

        'type.Cat':   'Кошка',
        'type.Dog':   'Собака',
        'type.Bird':  'Птица',
        'type.Other': 'Другое',

        'status.Open':      'Открыто',
        'status.Resolved':  'Решено',
        'status.Available': 'Доступно',
        'status.Adopted':   'Усыновлён',
        'status.Matched':   'Совпадение',

        'cat.Funny':    'Смешное',
        'cat.Touching': 'Трогательное',
        'cat.Useful':   'Полезное',

        'form.selectType':     'Выберите тип',
        'form.selectCategory': 'Выберите категорию',

        'btn.edit':   'Изменить',
        'btn.delete': 'Удалить',

        'btn.save.listing': 'Сохранить',
        'btn.save.request': 'Сохранить',
        'btn.share.story':  'Опубликовать',
        'btn.send.message': 'Отправить',
        'btn.send.another': 'Отправить ещё',
        'btn.cancel':       'Отмена',

        'form.add.found':    'Добавить найденного питомца',
        'form.add.lost':     'Сообщить о потере питомца',
        'form.add.forHome':  'Добавить питомца для усыновления',
        'form.add.adopt':    'Разместить запрос на усыновление',
        'form.edit.listing': 'Редактировать объявление',
        'form.add.stories':  'Поделиться историей',
        'form.edit.stories': 'Редактировать историю',

        'toast.listing.saved':   'Объявление сохранено!',
        'toast.listing.updated': 'Объявление обновлено!',
        'toast.listing.deleted': 'Объявление удалено.',
        'toast.story.saved':     'История опубликована!',
        'toast.story.updated':   'История обновлена!',
        'toast.story.deleted':   'История удалена.',

        'confirm.delete.listing': 'Удалить это объявление?',
        'confirm.delete.story':   'Удалить эту историю?',

        'error.required': 'Это поле обязательно.',
        'error.email':    'Введите корректный email.',

        'empty.found':   'Найденных питомцев пока нет. Будьте первым!',
        'empty.lost':    'Потерянных питомцев пока нет.',
        'empty.forHome': 'Питомцев для усыновления пока нет.',
        'empty.adopt':   'Запросов на усыновление пока нет. Будьте первым!',
        'empty.stories': 'Историй пока нет. Поделитесь первой!',

        'search.found':   'Поиск по названию, городу, описанию…',
        'search.lost':    'Поиск по названию, городу, описанию…',
        'search.forHome': 'Поиск по названию, городу, описанию…',
        'search.adopt':   'Поиск по городу, описанию…',
        'search.stories': 'Поиск историй…',

        'contact.success.title': 'Сообщение отправлено!',
        'contact.success.text':  'Спасибо за обращение. Мы ответим в течение 2 рабочих дней.',
    },

    he: {
        'nav.home':    'בית',
        'nav.found':   'חיות שנמצאו',
        'nav.lost':    'חיות אבודות',
        'nav.forHome': 'לאימוץ',
        'nav.adopt':   'רוצה לאמץ',
        'nav.stories': 'סיפורים',
        'nav.contact': 'צור קשר',

        'home.hero.title': 'ברוכים הבאים ל-Pet Friends',
        'home.hero.text':  'פלטפורמה קהילתית לאוהבי בעלי חיים. מצאתם חיה, איבדתם חיה, או רוצים לאמץ — הגעתם למקום הנכון.',

        'home.card.found.title': 'מצאתי חיה',
        'home.card.found.text':  'מצאתם חיה אבודה? פרסמו מודעה כדי שהבעלים יוכל למצוא את חברו.',
        'home.card.found.btn':   'חיות שנמצאו',
        'home.card.lost.title':  'איבדתי חיה',
        'home.card.lost.text':   'איבדתם את החיה שלכם? פרסמו מודעה עם פרטים כדי לעזור להם לחזור הביתה.',
        'home.card.lost.btn':    'חיות אבודות',
        'home.card.forHome.title': 'חיה מחפשת בית',
        'home.card.forHome.text':  'יש לכם חיה שזקוקה לבית חדש? ספרו את הסיפור שלה ומצאו משפחה מושלמת.',
        'home.card.forHome.btn':   'חיות לאימוץ',
        'home.card.adopt.title': 'רוצה לאמץ',
        'home.card.adopt.text':  'מוכנים לקבל בן משפחה חדש? עיינו בחיות או פרסמו בקשת אימוץ.',
        'home.card.adopt.btn':   'רוצה לאמץ',

        'stat.found':   'נמצאו',
        'stat.lost':    'אבדו',
        'stat.forHome': 'לאימוץ',
        'stat.adopt':   'בקשות אימוץ',
        'stat.stories': 'סיפורים',

        'section.found.title':   '🔍 חיות שנמצאו',
        'section.found.sub':     'עיינו בחיות שנמצאו. האם אחת מהן שלכם?',
        'section.lost.title':    '😢 חיות אבודות',
        'section.lost.sub':      'עזרו לחיות לחזור לבעליהן. ראיתם מישהו מהם?',
        'section.forHome.title': '🏠 חיות מחפשות בית',
        'section.forHome.sub':   'חיות נפלאות אלו מחפשות בית קבוע. אולי אתם הם?',
        'section.adopt.title':   '❤️ רוצה לאמץ',
        'section.adopt.sub':     'פרסמו בקשת אימוץ או עיינו בבקשות פתוחות.',
        'section.stories.title': '📖 סיפורי חיות',
        'section.stories.sub':   'שתפו סיפורים מצחיקים, מרגשים או שימושיים על חיות!',
        'section.contact.title': '📬 צור קשר',
        'section.contact.sub':   'יש לכם שאלה או הצעה? נשמח לשמוע מכם!',

        'btn.post.found':   '+ פרסם חיה שנמצאה',
        'btn.post.lost':    '+ דווח על חיה אבודה',
        'btn.post.forHome': '+ הוסף חיה לאימוץ',
        'btn.post.adopt':   '+ פרסם בקשת אימוץ',
        'btn.post.stories': '+ שתף סיפור',

        'footer': '🐾 Pet Friends — קהילה לאוהבי בעלי חיים | אתר תרגול לסטודנטים ל-QA',

        'filter.allTypes':      'כל הסוגים',
        'filter.allCities':     'כל הערים',
        'filter.allStatuses':   'כל הסטטוסים',
        'filter.allCategories': 'כל הקטגוריות',

        'type.Cat':   'חתול',
        'type.Dog':   'כלב',
        'type.Bird':  'ציפור',
        'type.Other': 'אחר',

        'status.Open':      'פתוח',
        'status.Resolved':  'נפתר',
        'status.Available': 'זמין',
        'status.Adopted':   'אומץ',
        'status.Matched':   'הותאם',

        'cat.Funny':    'מצחיק',
        'cat.Touching': 'מרגש',
        'cat.Useful':   'שימושי',

        'form.selectType':     'בחר סוג',
        'form.selectCategory': 'בחר קטגוריה',

        'btn.edit':   'עריכה',
        'btn.delete': 'מחיקה',

        'btn.save.listing': 'שמור מודעה',
        'btn.save.request': 'שמור בקשה',
        'btn.share.story':  'פרסם סיפור',
        'btn.send.message': 'שלח הודעה',
        'btn.send.another': 'שלח הודעה נוספת',
        'btn.cancel':       'ביטול',

        'form.add.found':    'פרסם חיה שנמצאה',
        'form.add.lost':     'דווח על חיה אבודה',
        'form.add.forHome':  'הוסף חיה לאימוץ',
        'form.add.adopt':    'פרסם בקשת אימוץ',
        'form.edit.listing': 'עריכת מודעה',
        'form.add.stories':  'שתף סיפור',
        'form.edit.stories': 'ערוך סיפור',

        'toast.listing.saved':   'המודעה נשמרה!',
        'toast.listing.updated': 'המודעה עודכנה!',
        'toast.listing.deleted': 'המודעה נמחקה.',
        'toast.story.saved':     'הסיפור פורסם!',
        'toast.story.updated':   'הסיפור עודכן!',
        'toast.story.deleted':   'הסיפור נמחק.',

        'confirm.delete.listing': 'למחוק את המודעה?',
        'confirm.delete.story':   'למחוק את הסיפור?',

        'error.required': 'שדה זה הוא חובה.',
        'error.email':    'יש להזין כתובת אימייל תקינה.',

        'empty.found':   'עדיין אין חיות שנמצאו. היו הראשונים!',
        'empty.lost':    'אין חיות אבודות כרגע.',
        'empty.forHome': 'עדיין אין חיות לאימוץ.',
        'empty.adopt':   'עדיין אין בקשות אימוץ. היו הראשונים!',
        'empty.stories': 'עדיין אין סיפורים. שתפו את הראשון!',

        'search.found':   'חיפוש לפי שם, עיר, תיאור…',
        'search.lost':    'חיפוש לפי שם, עיר, תיאור…',
        'search.forHome': 'חיפוש לפי שם, עיר, תיאור…',
        'search.adopt':   'חיפוש לפי עיר, תיאור…',
        'search.stories': 'חיפוש בסיפורים…',

        'contact.success.title': 'ההודעה נשלחה!',
        'contact.success.text':  'תודה שפנית אלינו. נחזור אליך תוך 2 ימי עסקים.',
    },
};

// Shorthand helpers — read current lang from <html lang=""> set by applyTranslations
function t(key) {
    const lang = document.documentElement.lang || DEFAULT_LANG;
    const tbl  = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    return tbl[key] ?? key;
}

function tType(type)     { return type   ? t('type.'   + type)   : ''; }
function tStatus(status) { return status ? t('status.' + status) : ''; }
function tCat(cat)       { return cat    ? t('cat.'    + cat)    : ''; }

function applyTranslations(lang) {
    const tbl = TRANSLATIONS[lang];
    if (!tbl) return;

    // Set lang/dir/class FIRST so t() returns the right language during re-render
    const isRTL = lang === 'he';
    document.documentElement.lang = lang;
    document.documentElement.dir  = isRTL ? 'rtl' : 'ltr';
    document.body.classList.remove('lang-en', 'lang-ru', 'lang-he');
    document.body.classList.add('lang-' + lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    localStorage.setItem(LANG_KEY, lang);

    // Static data-i18n text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (tbl[key] !== undefined) el.textContent = tbl[key];
    });

    // Placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (tbl[key] !== undefined) el.placeholder = tbl[key];
    });

    // Re-render dynamic cards so type/status/button labels update immediately
    if (document.getElementById('listings-found')) {
        ['found', 'lost', 'forHome', 'adopt'].forEach(renderListings);
        renderStories();
    }
}

function initLanguage() {
    const saved = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
    applyTranslations(saved);
}

// ===== HELPERS =====

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
}

function fmtDate(str) {
    if (!str) return '';
    const d = new Date(str + 'T00:00:00');
    if (isNaN(d)) return str;
    const lang   = document.documentElement.lang || DEFAULT_LANG;
    const locale = lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US';
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

let toastTimer;
function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ===== NAVIGATION =====

function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));

    const sec  = document.getElementById('section-' + name);
    const link = document.querySelector(`.nav-link[data-section="${name}"]`);
    if (sec)  sec.classList.add('active');
    if (link) link.classList.add('active');

    document.getElementById('mainNav').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (name === 'home') updateStats();
}

// ===== CITY FILTER =====

function refreshCityFilter(section, data) {
    const sel = document.getElementById('filter-city-' + section);
    if (!sel) return;
    const cities  = [...new Set(data.map(d => d.city).filter(Boolean))].sort();
    const current = sel.value;
    sel.innerHTML = `<option value="">${esc(t('filter.allCities'))}</option>` +
        cities.map(c => `<option value="${esc(c)}"${c === current ? ' selected' : ''}>${esc(c)}</option>`).join('');
}

// ===== STANDARD LISTING SECTIONS =====

const LISTING_FIELDS = ['type', 'title', 'city', 'date', 'description', 'email', 'phone', 'status'];

function renderListings(section) {
    const data    = load(section);
    const grid    = document.getElementById('listings-' + section);
    const empty   = document.getElementById('empty-' + section);
    const search  = (document.getElementById('search-' + section)?.value ?? '').toLowerCase();
    const typeVal = document.getElementById('filter-type-' + section)?.value ?? '';
    const cityVal = document.getElementById('filter-city-' + section)?.value ?? '';
    const statVal = document.getElementById('filter-status-' + section)?.value ?? '';

    refreshCityFilter(section, data);

    const filtered = data.filter(item => {
        const txt = (item.title + ' ' + item.city + ' ' + item.description).toLowerCase();
        return (!search  || txt.includes(search))
            && (!typeVal || item.type   === typeVal)
            && (!cityVal || item.city   === cityVal)
            && (!statVal || item.status === statVal);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(item => `
        <div class="listing-card ${section}">
            <div class="card-header">
                <div class="card-title">${esc(item.title)}</div>
                <span class="badge badge-type">${esc(tType(item.type))}</span>
            </div>
            <div class="card-meta">
                <span>📍 ${esc(item.city)}</span>
                <span>📅 ${fmtDate(item.date)}</span>
            </div>
            <p class="card-desc">${esc(item.description)}</p>
            ${item.email || item.phone ? `
            <div class="card-contact">
                ${item.email ? `<div>✉️ <a href="mailto:${esc(item.email)}">${esc(item.email)}</a></div>` : ''}
                ${item.phone ? `<div>📞 <a href="tel:${esc(item.phone)}">${esc(item.phone)}</a></div>` : ''}
            </div>` : ''}
            <span class="badge badge-status-${esc(item.status?.toLowerCase())}">${esc(tStatus(item.status))}</span>
            <div class="card-actions">
                <button class="btn btn-edit"   data-action="edit"   data-id="${esc(item.id)}">${t('btn.edit')}</button>
                <button class="btn btn-delete" data-action="delete" data-id="${esc(item.id)}">${t('btn.delete')}</button>
            </div>
        </div>
    `).join('');
}

function setupListingSection(section) {
    const formWrap  = document.getElementById('form-' + section);
    const form      = document.getElementById('listingForm-' + section);
    const formTitle = document.getElementById('form-title-' + section);
    const editIdEl  = document.getElementById('editId-' + section);
    const showBtn   = document.getElementById('showFormBtn-' + section);
    const cancelBtn = document.getElementById('cancelForm-' + section);
    const grid      = document.getElementById('listings-' + section);

    function openForm(forAdd = true) {
        formTitle.textContent = forAdd ? t('form.add.' + section) : t('form.edit.listing');
        formWrap.classList.remove('hidden');
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeForm() {
        form.reset();
        editIdEl.value = '';
        clearErrors(form);
        formWrap.classList.add('hidden');
    }

    showBtn?.addEventListener('click', () => {
        if (!formWrap.classList.contains('hidden')) { closeForm(); return; }
        editIdEl.value = '';
        form.reset();
        clearErrors(form);
        openForm(true);
    });

    cancelBtn?.addEventListener('click', closeForm);

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(form)) return;

        const fd  = new FormData(form);
        const obj = {};
        fd.forEach((v, k) => { obj[k] = v.trim(); });

        const editId = editIdEl.value;
        const data   = load(section);

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx !== -1) {
                data[idx] = { ...data[idx], ...obj };
                save(section, data);
                showToast(t('toast.listing.updated'));
            }
        } else {
            data.unshift({ ...obj, id: genId(), createdAt: Date.now() });
            save(section, data);
            showToast(t('toast.listing.saved'));
        }

        closeForm();
        renderListings(section);
        updateStats();
    });

    grid?.addEventListener('click', e => {
        const editBtn   = e.target.closest('[data-action="edit"]');
        const deleteBtn = e.target.closest('[data-action="delete"]');

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm(t('confirm.delete.listing'))) return;
            const updated = load(section).filter(d => d.id !== id);
            save(section, updated);
            renderListings(section);
            updateStats();
            showToast(t('toast.listing.deleted'));
        }

        if (editBtn) {
            const id   = editBtn.dataset.id;
            const item = load(section).find(d => d.id === id);
            if (!item) return;
            editIdEl.value = id;
            form.reset();
            clearErrors(form);
            LISTING_FIELDS.forEach(f => {
                const el = form.elements[f];
                if (el) el.value = item[f] ?? '';
            });
            openForm(false);
        }
    });

    ['search', 'filter-type', 'filter-city', 'filter-status'].forEach(prefix => {
        document.getElementById(prefix + '-' + section)
            ?.addEventListener('input',  () => renderListings(section));
        document.getElementById(prefix + '-' + section)
            ?.addEventListener('change', () => renderListings(section));
    });
}

// ===== STORIES =====

function renderStories() {
    const data   = load('stories');
    const grid   = document.getElementById('listings-stories');
    const empty  = document.getElementById('empty-stories');
    const search = (document.getElementById('search-stories')?.value ?? '').toLowerCase();
    const catVal = document.getElementById('filter-cat-stories')?.value ?? '';

    const filtered = data.filter(item => {
        const txt = (item.title + ' ' + item.text).toLowerCase();
        return (!search || txt.includes(search))
            && (!catVal || item.category === catVal);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(item => `
        <div class="listing-card stories">
            ${item.mediaUrl ? `<img class="card-media" src="${esc(item.mediaUrl)}" alt="${esc(item.title)}" loading="lazy" onerror="this.remove()">` : ''}
            <div class="card-header">
                <div class="card-title">${esc(item.title)}</div>
                <span class="badge story-cat-${esc(item.category?.toLowerCase())}">${esc(tCat(item.category))}</span>
            </div>
            <div class="card-meta"><span>📅 ${fmtDate(item.date)}</span></div>
            <p class="card-desc">${esc(item.text)}</p>
            <div class="card-actions">
                <button class="btn btn-edit"   data-action="edit"   data-id="${esc(item.id)}">${t('btn.edit')}</button>
                <button class="btn btn-delete" data-action="delete" data-id="${esc(item.id)}">${t('btn.delete')}</button>
            </div>
        </div>
    `).join('');
}

function setupStoriesSection() {
    const formWrap  = document.getElementById('form-stories');
    const form      = document.getElementById('listingForm-stories');
    const formTitle = document.getElementById('form-title-stories');
    const editIdEl  = document.getElementById('editId-stories');
    const showBtn   = document.getElementById('showFormBtn-stories');
    const cancelBtn = document.getElementById('cancelForm-stories');
    const grid      = document.getElementById('listings-stories');

    function openForm(forAdd = true) {
        formTitle.textContent = forAdd ? t('form.add.stories') : t('form.edit.stories');
        formWrap.classList.remove('hidden');
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeForm() {
        form.reset();
        editIdEl.value = '';
        clearErrors(form);
        formWrap.classList.add('hidden');
    }

    showBtn?.addEventListener('click', () => {
        if (!formWrap.classList.contains('hidden')) { closeForm(); return; }
        editIdEl.value = '';
        form.reset();
        clearErrors(form);
        openForm(true);
    });

    cancelBtn?.addEventListener('click', closeForm);

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(form)) return;

        const fd  = new FormData(form);
        const obj = {};
        fd.forEach((v, k) => { obj[k] = v.trim(); });
        obj.date = new Date().toISOString().split('T')[0];

        const editId = editIdEl.value;
        const data   = load('stories');

        if (editId) {
            const idx = data.findIndex(d => d.id === editId);
            if (idx !== -1) {
                data[idx] = { ...data[idx], ...obj };
                save('stories', data);
                showToast(t('toast.story.updated'));
            }
        } else {
            data.unshift({ ...obj, id: genId(), createdAt: Date.now() });
            save('stories', data);
            showToast(t('toast.story.saved'));
        }

        closeForm();
        renderStories();
        updateStats();
    });

    grid?.addEventListener('click', e => {
        const editBtn   = e.target.closest('[data-action="edit"]');
        const deleteBtn = e.target.closest('[data-action="delete"]');

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm(t('confirm.delete.story'))) return;
            const updated = load('stories').filter(d => d.id !== id);
            save('stories', updated);
            renderStories();
            updateStats();
            showToast(t('toast.story.deleted'));
        }

        if (editBtn) {
            const id   = editBtn.dataset.id;
            const item = load('stories').find(d => d.id === id);
            if (!item) return;
            editIdEl.value = id;
            form.reset();
            clearErrors(form);
            ['title', 'category', 'text', 'mediaUrl'].forEach(f => {
                const el = form.elements[f];
                if (el) el.value = item[f] ?? '';
            });
            openForm(false);
        }
    });

    document.getElementById('search-stories')?.addEventListener('input',  renderStories);
    document.getElementById('filter-cat-stories')?.addEventListener('change', renderStories);
}

// ===== CONTACT =====

function setupContact() {
    const form     = document.getElementById('contactForm');
    const formWrap = document.getElementById('contactFormWrap');
    const success  = document.getElementById('contactSuccess');
    const resetBtn = document.getElementById('contactReset');

    form?.addEventListener('submit', e => {
        e.preventDefault();
        if (!validateForm(form)) return;
        formWrap.classList.add('hidden');
        success.classList.remove('hidden');
    });

    resetBtn?.addEventListener('click', () => {
        form.reset();
        clearErrors(form);
        success.classList.add('hidden');
        formWrap.classList.remove('hidden');
    });
}

// ===== FORM VALIDATION =====

function validateForm(form) {
    clearErrors(form);
    let valid = true;

    form.querySelectorAll('[required]').forEach(el => {
        if (!el.value.trim()) {
            markInvalid(el, t('error.required'));
            valid = false;
        }
    });

    form.querySelectorAll('input[type="email"]').forEach(el => {
        if (el.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) {
            markInvalid(el, t('error.email'));
            valid = false;
        }
    });

    if (!valid) {
        const firstInvalid = form.querySelector('.invalid');
        firstInvalid?.focus();
        firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return valid;
}

function markInvalid(el, msg) {
    el.classList.add('invalid');
    let err = el.parentElement.querySelector('.field-error');
    if (!err) {
        err = document.createElement('span');
        err.className = 'field-error';
        el.after(err);
    }
    err.textContent = msg;
    err.classList.add('visible');
}

function clearErrors(form) {
    form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    form.querySelectorAll('.field-error').forEach(el => el.remove());
}

// ===== STATS =====

function updateStats() {
    ['found', 'lost', 'forHome', 'adopt', 'stories'].forEach(s => {
        const el = document.getElementById('stat-' + s);
        if (el) el.textContent = load(s).length;
    });
}

// ===== SAMPLE DATA =====

function seedSampleData() {
    if (localStorage.getItem(KEYS.seeded)) return;

    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastWeek  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    save('found', [
        {
            id: genId(), type: 'Cat', title: 'Orange tabby cat',
            city: 'Austin', date: yesterday,
            description: 'Found near Central Park. Very friendly, has no collar. Eating well. Please contact if this is your cat!',
            email: 'finder@example.com', phone: '555-0101', status: 'Open', createdAt: Date.now() - 3000,
        },
        {
            id: genId(), type: 'Dog', title: 'Small white terrier',
            city: 'Denver', date: lastWeek,
            description: 'Found wandering near Pine Street. Blue collar, no tags. Well-behaved and house-trained.',
            email: 'goodsam@example.com', phone: '555-0102', status: 'Open', createdAt: Date.now() - 2000,
        },
        {
            id: genId(), type: 'Bird', title: 'Green parakeet',
            city: 'Austin', date: today,
            description: 'Landed on my balcony this morning. Seems tame and trained. Responds to whistling.',
            email: 'birdfinder@example.com', phone: '', status: 'Open', createdAt: Date.now() - 1000,
        },
    ]);

    save('lost', [
        {
            id: genId(), type: 'Dog', title: 'Max — Golden Retriever',
            city: 'Chicago', date: yesterday,
            description: 'Max is 3 years old. Lost near Riverside Park. Red collar with ID tag. Very friendly. Reward offered!',
            email: 'maxowner@example.com', phone: '555-0201', status: 'Open', createdAt: Date.now() - 2000,
        },
        {
            id: genId(), type: 'Cat', title: 'Luna — Black cat',
            city: 'Portland', date: lastWeek,
            description: 'Luna is 2 years old, fully black with green eyes. She is microchipped. Last seen near Oak Street.',
            email: 'lunafamily@example.com', phone: '555-0202', status: 'Open', createdAt: Date.now() - 1000,
        },
    ]);

    save('forHome', [
        {
            id: genId(), type: 'Cat', title: 'Whiskers — 4yr tabby',
            city: 'Seattle', date: lastWeek,
            description: 'Sweet 4-year-old tabby who loves cuddles. Owner is moving abroad. Neutered, vaccinated, very healthy.',
            email: 'whiskers@example.com', phone: '555-0301', status: 'Available', createdAt: Date.now() - 3000,
        },
        {
            id: genId(), type: 'Dog', title: 'Buddy — 2yr Beagle mix',
            city: 'Miami', date: yesterday,
            description: 'Energetic 2-year-old beagle mix. Great with kids! Needs a yard. Owner relocating for work.',
            email: 'buddyadopt@example.com', phone: '555-0302', status: 'Available', createdAt: Date.now() - 2000,
        },
        {
            id: genId(), type: 'Other', title: 'Snowflake — Holland Lop rabbit',
            city: 'Boston', date: lastWeek,
            description: 'Beautiful white Holland Lop rabbit. Very calm, litter trained. Comes with cage and all supplies.',
            email: 'bunny@example.com', phone: '555-0303', status: 'Available', createdAt: Date.now() - 1000,
        },
    ]);

    save('adopt', [
        {
            id: genId(), type: 'Cat', title: 'Looking for a calm senior cat',
            city: 'Seattle', date: lastWeek,
            description: 'Retired couple with quiet home. Lots of time and love to give. Previous cat owners, experienced.',
            email: 'adopter1@example.com', phone: '555-0401', status: 'Open', createdAt: Date.now() - 2000,
        },
        {
            id: genId(), type: 'Dog', title: 'Family wants a medium-size dog',
            city: 'Austin', date: yesterday,
            description: 'Family of 4 with backyard looking for a friendly, active dog. We hike, bike, and love the outdoors!',
            email: 'family@example.com', phone: '555-0402', status: 'Open', createdAt: Date.now() - 1000,
        },
    ]);

    save('stories', [
        {
            id: genId(), title: 'My cat thinks she owns the Wi-Fi router',
            category: 'Funny', date: lastWeek, mediaUrl: '',
            text: 'Every evening, Mochi sits directly on top of the Wi-Fi router. We thought it was for warmth. Turns out she just likes watching us crawl on our knees begging her to move when the internet slows down.',
            createdAt: Date.now() - 3000,
        },
        {
            id: genId(), title: 'Rescued from the highway, now rules the couch',
            category: 'Touching', date: yesterday, mediaUrl: '',
            text: 'We spotted a tiny kitten on the highway shoulder during a rainstorm — terrified, soaking wet, barely a few weeks old. Today, two years later, she is the queen of our home and my daughter\'s best friend.',
            createdAt: Date.now() - 2000,
        },
        {
            id: genId(), title: 'How I trained my dog to bring medication reminders',
            category: 'Useful', date: today, mediaUrl: '',
            text: 'My elderly mother forgets her evening medication. I spent 3 weeks training our Lab mix to bring her the pill organizer at 8 pm every day. He nudges her arm until she takes them. Positive reinforcement with treats was the key.',
            createdAt: Date.now() - 1000,
        },
    ]);

    localStorage.setItem(KEYS.seeded, '1');
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', () => {
    seedSampleData();

    // Language switcher
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTranslations(btn.dataset.lang));
    });

    // Nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });

    // Inline nav links in contact panel
    document.querySelectorAll('.nav-link-inline').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });

    // Action cards on home
    document.querySelectorAll('.action-card').forEach(card => {
        card.addEventListener('click', () => showSection(card.dataset.section));
    });

    // Mobile nav toggle
    document.getElementById('navToggle')?.addEventListener('click', () => {
        document.getElementById('mainNav').classList.toggle('open');
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', e => {
        const nav    = document.getElementById('mainNav');
        const toggle = document.getElementById('navToggle');
        if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== toggle) {
            nav.classList.remove('open');
        }
    });

    // Set up listing sections (event listeners; initial render happens inside initLanguage)
    ['found', 'lost', 'forHome', 'adopt'].forEach(s => setupListingSection(s));
    setupStoriesSection();
    setupContact();
    updateStats();

    // Apply saved/default language — triggers the first render of all cards
    initLanguage();

    showSection('home');
});
