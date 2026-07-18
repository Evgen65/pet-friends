'use strict';

// ===== STORAGE =====

const KEYS = {
    found:            'pf_found',
    lost:             'pf_lost',
    forHome:          'pf_forHome',
    adopt:            'pf_adopt',
    stories:          'pf_stories',
    storyCategories:  'pf_storyCategories',
    seeded:           'pf_seeded',
};

// Per-section in-memory cache for API-enabled sections — populated by refreshSectionFromApi().
const apiListingsCache = {};

// Per-section active filter/sort state, sent as API query params by refreshSectionFromApi().
const sectionFilters = {};

function getSectionFilters(section) {
    return sectionFilters[section] ?? (sectionFilters[section] = {
        q: '', petType: '', city: '', status: '', sort: 'newest',
    });
}

function isSectionFilterActive(section) {
    const f = getSectionFilters(section);
    return !!(f.q || f.petType || f.city || f.status || (f.sort && f.sort !== 'newest'));
}

// ===== "LOAD MORE" PAGINATION (listing sections only, not Pet Stories) =====

const LISTINGS_PAGE_SIZE = 12;
const sectionPagination  = {};

function getSectionPagination(section) {
    return sectionPagination[section] ?? (sectionPagination[section] = {
        page: 1, totalPages: 1, total: 0, loadingMore: false,
    });
}

function updateLoadMoreButton(section) {
    const wrapper = document.getElementById('loadMoreWrapper-' + section);
    const btn     = document.getElementById('loadMoreBtn-' + section);
    if (!wrapper || !btn) return;
    const p = getSectionPagination(section);
    wrapper.classList.toggle('hidden', p.page >= p.totalPages);
    btn.disabled     = p.loadingMore;
    btn.textContent  = p.loadingMore ? t('btn.loadingMore') : t('btn.loadMore');
}

// Generic debounce — used for text inputs (search / city) so we don't
// re-fetch on every keystroke.
function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

function load(key) {
    if (window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.has(key)) {
        return apiListingsCache[key] ?? [];
    }
    const raw = window.PetFriendsListingsDataSource.load(key);
    if (key === 'stories') return raw;
    return raw.map(item => ({ ...item, photo: normalizePhoto(item.photo) }));
}

function save(key, data) {
    return window.PetFriendsListingsDataSource.save(key, data);
}

// ===== SECTION MESSAGES (loading / error banners with optional retry) =====
// One optional #message-<section> element per API-backed section. The
// existing #empty-<section> element is left untouched for the true
// "request succeeded, zero results" case.

function setSectionLoading(section) {
    const el = document.getElementById('message-' + section);
    if (!el) return;
    el.className   = 'section-message loading';
    el.textContent = section === 'stories' ? t('loading.stories') : t('loading.listings');
}

function setSectionError(section) {
    const el = document.getElementById('message-' + section);
    if (!el) return;
    el.className = 'section-message error';
    const msg    = section === 'stories' ? t('error.stories') : t('error.listings');
    el.innerHTML = `<span>${esc(msg)}</span> <button type="button" class="retry-button" data-retry-section="${esc(section)}">${esc(t('btn.retry'))}</button>`;
}

function clearSectionMessage(section) {
    const el = document.getElementById('message-' + section);
    if (!el) return;
    el.className = 'section-message hidden';
    el.innerHTML = '';
}

// Re-applies the currently-shown message's text in the active language
// (called from applyTranslations) without re-triggering a fetch.
function refreshSectionMessageLanguage(section) {
    const el = document.getElementById('message-' + section);
    if (!el) return;
    if (el.classList.contains('loading'))     setSectionLoading(section);
    else if (el.classList.contains('error'))  setSectionError(section);
}

// Fetch a section from the backend API, update the cache, and re-render.
// Errors are logged but do not crash the app; other sections keep working.
//
// { append: true } loads the *next* page and concatenates it onto the
// existing cache (used by the "Load more" button). The default (append:
// false) always starts over from page 1 — used for the initial load,
// filter/sort changes, Clear filters, and post-CRUD reloads — so pages
// never accumulate stale state and cards are never duplicated.
async function refreshSectionFromApi(section, { append = false } = {}) {
    const pInfo = getSectionPagination(section);

    if (append) {
        if (pInfo.loadingMore) return; // guard against double-click
        pInfo.loadingMore = true;
        updateLoadMoreButton(section);
    } else {
        setSectionLoading(section);
        pInfo.page = 1;
    }

    const requestedPage = append ? pInfo.page + 1 : 1;

    try {
        const { items, pagination } = await window.PetFriendsListingsDataSource.apiGetListings(
            section,
            getSectionFilters(section),
            { page: requestedPage, limit: LISTINGS_PAGE_SIZE, withMeta: true }
        );

        apiListingsCache[section] = append
            ? [...(apiListingsCache[section] ?? []), ...items]
            : items;

        pInfo.page        = pagination.page ?? requestedPage;
        pInfo.totalPages  = pagination.totalPages ?? 1;
        pInfo.total       = pagination.total ?? apiListingsCache[section].length;
        pInfo.loadingMore = false;

        if (!append) clearSectionMessage(section);
        renderListings(section);
        updateLoadMoreButton(section);
    } catch (err) {
        console.error(`[${section}] Failed to load from API:`, err.message);
        pInfo.loadingMore = false;

        if (append) {
            // Keep whatever is already displayed; just surface the error and
            // let the user retry via the button.
            showToast(t('error.listings'));
            updateLoadMoreButton(section);
        } else {
            setSectionError(section);
            document.getElementById('listings-' + section)?.replaceChildren();
            document.getElementById('empty-' + section)?.classList.add('hidden');
            document.getElementById('loadMoreWrapper-' + section)?.classList.add('hidden');
        }
    }
    updateStats();
}

// ===== PET STORIES — API cache & category side-map =====
// Stories are always API-backed (no localStorage fallback for story content).
// The backend pet_stories table has no "category" column, so category is kept
// in a small localStorage-only side-map, keyed by story id.

let storiesCache = [];

async function refreshStoriesFromApi() {
    setSectionLoading('stories');
    try {
        storiesCache = await window.PetFriendsStoriesDataSource.getStories();
        clearSectionMessage('stories');
        renderStories();
    } catch (err) {
        console.error('[stories] Failed to load from API:', err.message);
        storiesCache = [];
        setSectionError('stories');
        document.getElementById('listings-stories')?.replaceChildren();
        document.getElementById('empty-stories')?.classList.add('hidden');
    }
    updateStats();
}

function loadStoryCategories() {
    try {
        return JSON.parse(localStorage.getItem(KEYS.storyCategories) || '{}');
    } catch {
        return {};
    }
}

function getStoryCategory(id) {
    return loadStoryCategories()[id] || '';
}

function setStoryCategory(id, category) {
    const map = loadStoryCategories();
    if (category) map[id] = category; else delete map[id];
    localStorage.setItem(KEYS.storyCategories, JSON.stringify(map));
}

function deleteStoryCategory(id) {
    setStoryCategory(id, null);
}

// Build a backend-shaped Pet Stories payload from story form data.
// mediaUrl is the relative URL returned by the upload endpoint, or null.
function buildStoryApiPayload(obj, mediaUrl) {
    return {
        title:           obj.title || '',
        storyText:       obj.text  || '',
        mediaType:       mediaUrl ? 'image' : 'none',
        mediaUrl:        mediaUrl || null,
        contentLanguage: document.documentElement.lang || 'en',
        status:          'published',
    };
}

// Build a backend-shaped payload from listing form data.
// photoUrl is the relative URL returned by the upload endpoint, or null.
function buildApiPayload(section, obj, photoUrl) {
    return {
        scenario:        window.PetFriendsListingsDataSource.mapSectionKeyToScenario(section),
        petType:         (obj.type || '').toLowerCase(),
        petNameOrTitle:  obj.title        || '',
        breed:           obj.breed        || null,
        city:            obj.city         || '',
        eventDate:       obj.date         || null,
        description:     obj.description  || '',
        contactEmail:    obj.email        || null,
        contactPhone:    obj.phone        || null,
        status:          obj.status       || 'Open',
        contentLanguage: obj.contentLanguage || 'en',
        photoUrl:        photoUrl         || null,
    };
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
        'filter.cityPlaceholder': 'City…',
        'filter.sort.newest':   'Newest first',
        'filter.sort.oldest':   'Oldest first',
        'filter.sort.cityAsc':  'City A-Z',
        'filter.sort.cityDesc': 'City Z-A',
        'filter.clear':         'Clear filters',

        'type.Cat':    'Cat',
        'type.Dog':    'Dog',
        'type.Bird':   'Bird',
        'type.Rabbit': 'Rabbit',
        'type.Other':  'Other',

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
        'btn.viewDetails': 'View details',

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

        'empty.found':    'No found pet listings yet. Be the first to post!',
        'empty.lost':     'No lost pet listings at this time.',
        'empty.forHome':  'No pets listed for adoption yet.',
        'empty.adopt':    'No adoption requests yet. Be the first to post!',
        'empty.stories':  'No stories yet. Share the first one!',
        'empty.filtered': 'No listings match your filters.',

        'loading.listings': 'Loading listings…',
        'loading.stories':  'Loading stories…',
        'error.listings':   'Could not load listings. Please make sure the server is running.',
        'error.stories':    'Could not load stories. Please try again later.',
        'btn.retry':        'Retry',
        'btn.loadMore':     'Load more',
        'btn.loadingMore':  'Loading more…',

        'search.found':   'Search by name, city, description…',
        'search.lost':    'Search by name, city, description…',
        'search.forHome': 'Search by name, city, description…',
        'search.adopt':   'Search by city, description…',
        'search.stories': 'Search stories…',

        'contact.success.title': 'Message Sent!',
        'contact.success.text':  'Thank you for reaching out. We\'ll get back to you within 2 business days.',

        'card.petName':     'Pet Name',
        'card.petType':     'Pet Type',
        'card.breed':       'Breed',
        'card.city':        'City',
        'card.dateFound':   'Date Found',
        'card.dateLost':    'Date Lost',
        'card.datePosted':  'Date Posted',
        'card.description': 'Description',
        'card.contactEmail':'Contact Email',
        'card.contactPhone':'Contact Phone',
        'card.status':      'Status',
        'card.scenario':     'Category',
        'card.createdDate':  'Created',
        'card.updatedDate':  'Updated',
        'card.noDescription':'No description',

        'modal.details.title':    'Listing details',
        'modal.loading':          'Loading details…',
        'modal.contact':          'Contact',
        'btn.close':              'Close',
        'error.listingDetails':   'Could not load listing details. Please try again later.',
        'error.listingNotFound':  'Listing not found or no longer available.',

        'form.label.petName':      'Pet Name',
        'form.label.petNameTitle': 'Pet Name / Title',
        'form.label.listingTitle': 'Listing Title',
        'form.label.aboutHome':    'About You & Your Home',
        'btn.update.listing':      'Update Listing',

        'form.label.contentLang': 'Listing Language',
        'contentLang.en':         'English',
        'contentLang.ru':         'Russian',
        'contentLang.he':         'Hebrew',
        'card.contentLang':       'Listing language',

        'photo.label':       'Photo',
        'photo.choose':      'Choose Photo',
        'photo.replace':     'Replace Photo',
        'photo.remove':      'Remove Photo',
        'photo.hint':        'JPG, PNG or WEBP. Maximum size: 2 MB.',
        'photo.error.type':  'Only JPG, PNG and WEBP images are supported.',
        'photo.error.size':  'The image must not exceed 2 MB.',
        'photo.error.read':  'The selected image could not be read.',
        'photo.alt.generic': 'Pet photo',
        'error.storage':     'The image could not be saved because browser storage is full. Try a smaller image or remove an existing photo.',
        'error.save':        'Could not save. Please try again.',
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
        'filter.cityPlaceholder': 'Город…',
        'filter.sort.newest':   'Сначала новые',
        'filter.sort.oldest':   'Сначала старые',
        'filter.sort.cityAsc':  'Город А-Я',
        'filter.sort.cityDesc': 'Город Я-А',
        'filter.clear':         'Сбросить фильтры',

        'type.Cat':    'Кошка',
        'type.Dog':    'Собака',
        'type.Bird':   'Птица',
        'type.Rabbit': 'Кролик',
        'type.Other':  'Другое',

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
        'btn.viewDetails': 'Подробнее',

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

        'empty.found':    'Найденных питомцев пока нет. Будьте первым!',
        'empty.lost':     'Потерянных питомцев пока нет.',
        'empty.forHome':  'Питомцев для усыновления пока нет.',
        'empty.adopt':    'Запросов на усыновление пока нет. Будьте первым!',
        'empty.stories':  'Историй пока нет. Поделитесь первой!',
        'empty.filtered': 'Нет объявлений, соответствующих фильтрам.',

        'loading.listings': 'Загрузка объявлений…',
        'loading.stories':  'Загрузка историй…',
        'error.listings':   'Не удалось загрузить объявления. Убедитесь, что сервер запущен.',
        'error.stories':    'Не удалось загрузить истории. Попробуйте позже.',
        'btn.retry':        'Повторить',
        'btn.loadMore':     'Показать ещё',
        'btn.loadingMore':  'Загрузка…',

        'search.found':   'Поиск по имени, городу или описанию…',
        'search.lost':    'Поиск по имени, городу или описанию…',
        'search.forHome': 'Поиск по имени, городу или описанию…',
        'search.adopt':   'Поиск по городу или описанию…',
        'search.stories': 'Поиск историй…',

        'contact.success.title': 'Сообщение отправлено!',
        'contact.success.text':  'Спасибо за обращение. Мы ответим в течение 2 рабочих дней.',

        'card.petName':     'Имя питомца',
        'card.petType':     'Вид животного',
        'card.breed':       'Порода',
        'card.city':        'Город',
        'card.dateFound':   'Дата находки',
        'card.dateLost':    'Дата пропажи',
        'card.datePosted':  'Дата публикации',
        'card.description': 'Описание',
        'card.contactEmail':'Контактный email',
        'card.contactPhone':'Контактный телефон',
        'card.status':      'Статус',
        'card.scenario':     'Категория',
        'card.createdDate':  'Создано',
        'card.updatedDate':  'Обновлено',
        'card.noDescription':'Без описания',

        'modal.details.title':    'Детали объявления',
        'modal.loading':          'Загрузка деталей…',
        'modal.contact':          'Контакты',
        'btn.close':              'Закрыть',
        'error.listingDetails':   'Не удалось загрузить детали объявления. Попробуйте позже.',
        'error.listingNotFound':  'Объявление не найдено или больше недоступно.',

        'form.label.petName':      'Имя питомца',
        'form.label.petNameTitle': 'Имя питомца / заголовок',
        'form.label.listingTitle': 'Заголовок объявления',
        'form.label.aboutHome':    'О вас и вашем доме',
        'btn.update.listing':      'Обновить объявление',

        'form.label.contentLang': 'Язык объявления',
        'contentLang.en':         'Английский',
        'contentLang.ru':         'Русский',
        'contentLang.he':         'Иврит',
        'card.contentLang':       'Язык объявления',

        'photo.label':       'Фотография',
        'photo.choose':      'Выбрать фотографию',
        'photo.replace':     'Заменить фотографию',
        'photo.remove':      'Удалить фотографию',
        'photo.hint':        'JPG, PNG или WEBP. Максимальный размер — 2 МБ.',
        'photo.error.type':  'Поддерживаются только изображения JPG, PNG и WEBP.',
        'photo.error.size':  'Размер изображения не должен превышать 2 МБ.',
        'photo.error.read':  'Не удалось прочитать выбранное изображение.',
        'photo.alt.generic': 'Фото питомца',
        'error.storage':     'Не удалось сохранить изображение: хранилище браузера заполнено. Выберите изображение меньшего размера или удалите существующую фотографию.',
        'error.save':        'Не удалось сохранить. Пожалуйста, попробуйте ещё раз.',
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
        'filter.cityPlaceholder': 'עיר…',
        'filter.sort.newest':   'החדשים ביותר',
        'filter.sort.oldest':   'הישנים ביותר',
        'filter.sort.cityAsc':  'עיר א-ת',
        'filter.sort.cityDesc': 'עיר ת-א',
        'filter.clear':         'נקה מסננים',

        'type.Cat':    'חתול',
        'type.Dog':    'כלב',
        'type.Bird':   'ציפור',
        'type.Rabbit': 'ארנב',
        'type.Other':  'אחר',

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
        'btn.viewDetails': 'הצג פרטים',

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

        'empty.found':    'עדיין אין חיות שנמצאו. היו הראשונים!',
        'empty.lost':     'אין חיות אבודות כרגע.',
        'empty.forHome':  'עדיין אין חיות לאימוץ.',
        'empty.adopt':    'עדיין אין בקשות אימוץ. היו הראשונים!',
        'empty.stories':  'עדיין אין סיפורים. שתפו את הראשון!',
        'empty.filtered': 'אין מודעות התואמות את הסינון שלך.',

        'loading.listings': 'טוען מודעות…',
        'loading.stories':  'טוען סיפורים…',
        'error.listings':   'לא ניתן לטעון את המודעות. ודאו שהשרת פועל.',
        'error.stories':    'לא ניתן לטעון את הסיפורים. נסו שוב מאוחר יותר.',
        'btn.retry':        'נסה שוב',
        'btn.loadMore':     'טען עוד',
        'btn.loadingMore':  'טוען עוד…',

        'search.found':   'חיפוש לפי שם, עיר או תיאור…',
        'search.lost':    'חיפוש לפי שם, עיר או תיאור…',
        'search.forHome': 'חיפוש לפי שם, עיר או תיאור…',
        'search.adopt':   'חיפוש לפי עיר או תיאור…',
        'search.stories': 'חיפוש בסיפורים…',

        'contact.success.title': 'ההודעה נשלחה!',
        'contact.success.text':  'תודה שפנית אלינו. נחזור אליך תוך 2 ימי עסקים.',

        'card.petName':     'שם חיית המחמד',
        'card.petType':     'סוג חיית המחמד',
        'card.breed':       'גזע',
        'card.city':        'עיר',
        'card.dateFound':   'תאריך מציאה',
        'card.dateLost':    'תאריך אובדן',
        'card.datePosted':  'תאריך פרסום',
        'card.description': 'תיאור',
        'card.contactEmail':'אימייל ליצירת קשר',
        'card.contactPhone':'טלפון ליצירת קשר',
        'card.status':      'סטטוס',
        'card.scenario':     'קטגוריה',
        'card.createdDate':  'נוצר בתאריך',
        'card.updatedDate':  'עודכן בתאריך',
        'card.noDescription':'אין תיאור',

        'modal.details.title':    'פרטי המודעה',
        'modal.loading':          'טוען פרטים…',
        'modal.contact':          'יצירת קשר',
        'btn.close':              'סגירה',
        'error.listingDetails':   'לא ניתן לטעון את פרטי המודעה. נסו שוב מאוחר יותר.',
        'error.listingNotFound':  'המודעה לא נמצאה או שאינה זמינה יותר.',

        'form.label.petName':      'שם חיית המחמד',
        'form.label.petNameTitle': 'שם חיית המחמד / כותרת',
        'form.label.listingTitle': 'כותרת המודעה',
        'form.label.aboutHome':    'עלייך ועל הבית שלך',
        'btn.update.listing':      'עדכן מודעה',

        'form.label.contentLang': 'שפת המודעה',
        'contentLang.en':         'אנגלית',
        'contentLang.ru':         'רוסית',
        'contentLang.he':         'עברית',
        'card.contentLang':       'שפת המודעה',

        'photo.label':       'תמונה',
        'photo.choose':      'בחירת תמונה',
        'photo.replace':     'החלפת תמונה',
        'photo.remove':      'הסרת תמונה',
        'photo.hint':        'JPG, PNG או WEBP. גודל מרבי: 2MB.',
        'photo.error.type':  'נתמכים רק קובצי JPG, PNG ו-WEBP.',
        'photo.error.size':  'גודל התמונה לא יכול לעלות על 2MB.',
        'photo.error.read':  'לא ניתן לקרוא את התמונה שנבחרה.',
        'photo.alt.generic': 'תמונת חיית מחמד',
        'error.storage':     'לא ניתן לשמור את התמונה כי אחסון הדפדפן מלא. נסו תמונה קטנה יותר או הסירו תמונה קיימת.',
        'error.save':        'לא ניתן לשמור. אנא נסו שוב.',
    },
};

// Shorthand helpers — read current lang from <html lang=""> set by applyTranslations
function t(key) {
    const lang = document.documentElement.lang || DEFAULT_LANG;
    const tbl  = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANG];
    return tbl[key] ?? key;
}

function tType(type)     { return type   ? t('type.'   + type)   : ''; }
function tCat(cat)       { return cat    ? t('cat.'    + cat)    : ''; }

// Known status values, keyed by their translation suffix (status.<Key>).
// Listings created directly via the API/Postman may store status in any
// case ("open", "OPEN", ...) — normalize before lookup so the badge never
// shows a raw i18n key like "status.open" to the user.
const KNOWN_STATUSES = ['Open', 'Resolved', 'Available', 'Adopted', 'Matched'];

function tStatus(status) {
    const raw = String(status || '').trim();
    if (!raw) return '';
    const known = KNOWN_STATUSES.find(s => s.toLowerCase() === raw.toLowerCase());
    if (known) return t('status.' + known);
    // Unrecognized status: fall back to a readable label instead of the raw key.
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function getLocalizedField(item, fieldName) {
    const lang    = document.documentElement.lang || DEFAULT_LANG;
    const i18nKey = fieldName + 'I18n';
    if (item[i18nKey]) {
        return item[i18nKey][lang] || item[i18nKey][DEFAULT_LANG] || item[fieldName] || '';
    }
    return item[fieldName] || '';
}

// ===== PHOTO HELPERS =====

const PHOTO_PLACEHOLDER = 'assets/images/pet-placeholder.svg';
const PHOTO_MAX_BYTES   = 2 * 1024 * 1024;
const PHOTO_MAX_DIM     = 1200;
const PHOTO_TYPES       = ['image/jpeg', 'image/png', 'image/webp'];

// Pending photo changes per section:
//   undefined → no change (keep existing on edit, no photo on add)
//   null      → user explicitly removed photo
//   {source:'local',...} → new photo selected
const pendingPhotoChange = {};

function normalizePhoto(photo) {
    if (!photo) return null;
    if (photo.source === 'local') {
        return (typeof photo.dataUrl === 'string' && photo.dataUrl.startsWith('data:image/'))
            ? photo : null;
    }
    if (photo.source === 'asset' && typeof photo.url === 'string') return photo;
    return null;
}

function getPhotoSource(listing) {
    const p = normalizePhoto(listing?.photo);
    if (!p) return PHOTO_PLACEHOLDER;
    if (p.source === 'local') return p.dataUrl;
    if (p.source === 'asset') return p.url;
    return PHOTO_PLACEHOLDER;
}

function validateImageFile(file) {
    if (!PHOTO_TYPES.includes(file.type)) return 'photo.error.type';
    if (file.size > PHOTO_MAX_BYTES)      return 'photo.error.size';
    return null;
}

function readImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
    });
}

function resizeImage(dataUrl) {
    return new Promise(resolve => {
        const img = new Image();
        img.onerror = () => resolve(dataUrl);
        img.onload  = () => {
            const { width, height } = img;
            const ratio  = Math.min(1, PHOTO_MAX_DIM / Math.max(width, height));
            const canvas = document.createElement('canvas');
            canvas.width  = Math.round(width  * ratio);
            canvas.height = Math.round(height * ratio);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const webp = canvas.toDataURL('image/webp', 0.85);
            resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = dataUrl;
    });
}

function updatePhotoPreview(section, photoSrc) {
    const preview     = document.getElementById('photo-preview-'     + section);
    const placeholder = document.getElementById('photo-placeholder-' + section);
    const btnChoose   = document.getElementById('photoBtnChoose-'    + section);
    const btnReplace  = document.getElementById('photoBtnReplace-'   + section);
    const btnRemove   = document.getElementById('photoBtnRemove-'    + section);
    if (!preview) return;

    const hasPhoto = photoSrc && photoSrc !== PHOTO_PLACEHOLDER;
    preview.src = hasPhoto ? photoSrc : '';
    preview.classList.toggle('hidden', !hasPhoto);
    if (placeholder) placeholder.classList.toggle('hidden', hasPhoto);
    if (btnChoose)   btnChoose.classList.toggle('hidden',   hasPhoto);
    if (btnReplace)  btnReplace.classList.toggle('hidden',  !hasPhoto);
    if (btnRemove)   btnRemove.classList.toggle('hidden',   !hasPhoto);
}

function resetPendingPhoto(section) {
    pendingPhotoChange[section] = undefined;
    updatePhotoPreview(section, null);
    const input  = document.getElementById('photoInput-' + section);
    const errEl  = document.getElementById('photo-error-' + section);
    if (input)  input.value = '';
    if (errEl)  { errEl.textContent = ''; errEl.classList.remove('visible'); }
}

const SECTION_STATUSES = {
    found:   ['Open', 'Resolved'],
    lost:    ['Open', 'Resolved'],
    forHome: ['Available', 'Adopted'],
    adopt:   ['Open', 'Matched'],
};

function rebuildFilterSelects() {
    const types = ['Cat', 'Dog', 'Bird', 'Rabbit', 'Other'];

    ['found', 'lost', 'forHome', 'adopt'].forEach(section => {
        const typeSel = document.getElementById('filter-type-' + section);
        if (typeSel) {
            const cur = typeSel.value;
            typeSel.innerHTML = `<option value="">${esc(t('filter.allTypes'))}</option>` +
                types.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(tType(v))}</option>`).join('');
        }

        const statSel = document.getElementById('filter-status-' + section);
        if (statSel) {
            const cur = statSel.value;
            statSel.innerHTML = `<option value="">${esc(t('filter.allStatuses'))}</option>` +
                (SECTION_STATUSES[section] || []).map(v =>
                    `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(tStatus(v))}</option>`
                ).join('');
        }
    });

    const catSel = document.getElementById('filter-cat-stories');
    if (catSel) {
        const cur = catSel.value;
        catSel.innerHTML = `<option value="">${esc(t('filter.allCategories'))}</option>` +
            ['Funny', 'Touching', 'Useful'].map(v =>
                `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(tCat(v))}</option>`
            ).join('');
    }
}

// ===== LISTING FORM I18N =====

const SECTION_FORM_CONFIG = {
    found:   { titleKey: 'form.label.petNameTitle', dateKey: 'card.dateFound',  descKey: 'card.description',    statuses: ['Open', 'Resolved']    },
    lost:    { titleKey: 'form.label.petName',      dateKey: 'card.dateLost',   descKey: 'card.description',    statuses: ['Open', 'Resolved']    },
    forHome: { titleKey: 'form.label.petName',      dateKey: 'card.datePosted', descKey: 'card.description',    statuses: ['Available', 'Adopted'] },
    adopt:   { titleKey: 'form.label.listingTitle', dateKey: 'card.datePosted', descKey: 'form.label.aboutHome', statuses: ['Open', 'Matched']     },
};

function setLabelText(labelEl, text) {
    const req = labelEl.querySelector('.req');
    labelEl.textContent = text;
    if (req) labelEl.append(' ', req);
}

function updateListingFormTranslations(section, mode) {
    const cfg  = SECTION_FORM_CONFIG[section];
    if (!cfg) return;
    const form = document.getElementById('listingForm-' + section);
    if (!form) return;

    // Form title
    const titleEl = document.getElementById('form-title-' + section);
    if (titleEl) titleEl.textContent = mode === 'edit' ? t('form.edit.listing') : t('form.add.' + section);

    // Labels (look up by for="" inside the form)
    const lbl = id => form.querySelector(`label[for="${section}-${id}"]`);
    if (lbl('type'))   setLabelText(lbl('type'),   t('card.petType'));
    if (lbl('title'))  setLabelText(lbl('title'),  t(cfg.titleKey));
    if (lbl('city'))   setLabelText(lbl('city'),   t('card.city'));
    if (lbl('date'))   setLabelText(lbl('date'),   t(cfg.dateKey));
    if (lbl('desc'))   setLabelText(lbl('desc'),   t(cfg.descKey));
    if (lbl('email'))  lbl('email').textContent  = t('card.contactEmail');
    if (lbl('phone'))  lbl('phone').textContent  = t('card.contactPhone');
    if (lbl('status')) lbl('status').textContent = t('card.status');

    // Type select — preserve selected value
    const typeSel = document.getElementById(section + '-type');
    if (typeSel) {
        const cur = typeSel.value;
        typeSel.innerHTML = `<option value="">${esc(t('form.selectType'))}</option>` +
            ['Cat', 'Dog', 'Bird', 'Other'].map(v =>
                `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(tType(v))}</option>`
            ).join('');
    }

    // Status select — preserve selected value
    const statSel = document.getElementById(section + '-status');
    if (statSel) {
        const cur = statSel.value;
        statSel.innerHTML = cfg.statuses.map(v =>
            `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(tStatus(v))}</option>`
        ).join('');
    }

    // contentLanguage label + select — re-render options, preserve current value
    const contentLangLbl = form.querySelector(`label[for="${section}-contentLanguage"]`);
    if (contentLangLbl) contentLangLbl.textContent = t('form.label.contentLang');
    const contentLangSel = document.getElementById(section + '-contentLanguage');
    if (contentLangSel) {
        const validLangs = ['en', 'ru', 'he'];
        const cur = validLangs.includes(contentLangSel.value) ? contentLangSel.value : 'en';
        contentLangSel.innerHTML = validLangs.map(v =>
            `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(t('contentLang.' + v))}</option>`
        ).join('');
    }

    // Submit and Cancel buttons
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = mode === 'edit' ? t('btn.update.listing') : t('btn.save.listing');
    const cancelBtnEl = document.getElementById('cancelForm-' + section);
    if (cancelBtnEl) cancelBtnEl.textContent = t('btn.cancel');

    // Photo uploader labels
    const photoLabel   = document.getElementById('photo-label-'       + section);
    const photoHintEl  = form.querySelector('.photo-hint');
    const photoBtnC    = document.getElementById('photoBtnChoose-'    + section);
    const photoBtnR    = document.getElementById('photoBtnReplace-'   + section);
    const photoBtnRm   = document.getElementById('photoBtnRemove-'    + section);
    if (photoLabel)  photoLabel.textContent  = t('photo.label');
    if (photoHintEl) photoHintEl.textContent = t('photo.hint');
    if (photoBtnC)   photoBtnC.textContent   = t('photo.choose');
    if (photoBtnR)   photoBtnR.textContent   = t('photo.replace');
    if (photoBtnRm)  photoBtnRm.textContent  = t('photo.remove');
}

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

    // aria-label attributes
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.dataset.i18nAriaLabel;
        if (tbl[key] !== undefined) el.setAttribute('aria-label', tbl[key]);
    });

    // Re-render dynamic cards so type/status/button labels update immediately
    if (document.getElementById('listings-found')) {
        rebuildFilterSelects();
        ['found', 'lost', 'forHome', 'adopt'].forEach(section => {
            renderListings(section);
            refreshSectionMessageLanguage(section);
            updateLoadMoreButton(section);
            // If form is open, re-translate it without losing entered values
            const fw = document.getElementById('form-' + section);
            if (fw && !fw.classList.contains('hidden')) {
                const editId = document.getElementById('editId-' + section)?.value;
                updateListingFormTranslations(section, editId ? 'edit' : 'add');
            }
        });
        renderStories();
        refreshSectionMessageLanguage('stories');
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

// Formats an epoch-ms timestamp (createdAt / updatedAt) the same way fmtDate
// formats a YYYY-MM-DD string.
function fmtTimestamp(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    if (isNaN(d)) return '';
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

// ===== STANDARD LISTING SECTIONS =====

const LISTING_FIELDS = ['type', 'title', 'city', 'date', 'description', 'email', 'phone', 'status', 'contentLanguage'];

// Filtering/search/sort for API-enabled sections happens server-side (see
// refreshSectionFromApi + sectionFilters) — `data` here is already the
// filtered result set, so this just renders it.
function renderListings(section) {
    const data  = load(section);
    const grid  = document.getElementById('listings-' + section);
    const empty = document.getElementById('empty-' + section);

    if (data.length === 0) {
        grid.innerHTML = '';
        empty.textContent = isSectionFilterActive(section) ? t('empty.filtered') : t('empty.' + section);
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    const dateKey = section === 'found' ? 'card.dateFound'
                  : section === 'lost'  ? 'card.dateLost'
                  : 'card.datePosted';

    grid.innerHTML = data.map(item => {
        const localTitle     = getLocalizedField(item, 'title');
        const localDesc      = getLocalizedField(item, 'description');
        const photoSrc       = getPhotoSource(item);
        const photoAlt       = esc(localTitle || t('photo.alt.generic'));
        const contentLang    = item.contentLanguage ?? 'en';
        const contentDirClass = contentLang === 'he' ? 'user-content-rtl' : 'user-content-ltr';
        const rows = [];
        if (item.city)  rows.push(`<div class="card-field"><dt>${esc(t('card.city'))}</dt><dd><span class="${contentDirClass}">${esc(item.city)}</span></dd></div>`);
        if (item.date)  rows.push(`<div class="card-field"><dt>${esc(t(dateKey))}</dt><dd>${fmtDate(item.date)}</dd></div>`);
        if (localDesc)  rows.push(`<div class="card-field card-field--desc"><dt>${esc(t('card.description'))}</dt><dd><span class="${contentDirClass}">${esc(localDesc)}</span></dd></div>`);
        rows.push(`<div class="card-field"><dt>${esc(t('card.contentLang'))}</dt><dd><span class="badge badge-lang">${esc(t('contentLang.' + contentLang))}</span></dd></div>`);
        if (item.email) rows.push(`<div class="card-field"><dt>${esc(t('card.contactEmail'))}</dt><dd><a class="ltr-value" href="mailto:${esc(item.email)}">${esc(item.email)}</a></dd></div>`);
        if (item.phone) rows.push(`<div class="card-field"><dt>${esc(t('card.contactPhone'))}</dt><dd><span class="ltr-value"><a href="tel:${esc(item.phone)}">${esc(item.phone)}</a></span></dd></div>`);

        return `
        <div class="listing-card ${section}">
            <div class="card-photo">
                <img src="${esc(photoSrc)}" alt="${photoAlt}" loading="lazy"
                     onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${PHOTO_PLACEHOLDER}'}">
            </div>
            <div class="card-header">
                <div class="card-title"><span class="${contentDirClass}">${esc(localTitle)}</span></div>
                <span class="badge badge-type">${esc(tType(item.type))}</span>
            </div>
            ${rows.length ? `<dl class="card-fields">${rows.join('')}</dl>` : ''}
            <div class="card-status">
                <span class="card-field-label">${esc(t('card.status'))}</span>
                <span class="badge badge-status-${esc(item.status?.toLowerCase())}">${esc(tStatus(item.status))}</span>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary" data-action="details" data-id="${esc(item.id)}">${t('btn.viewDetails')}</button>
                <button class="btn btn-edit"   data-action="edit"   data-id="${esc(item.id)}">${t('btn.edit')}</button>
                <button class="btn btn-delete" data-action="delete" data-id="${esc(item.id)}">${t('btn.delete')}</button>
            </div>
        </div>
        `;
    }).join('');
}

function setupListingSection(section) {
    const formWrap   = document.getElementById('form-'         + section);
    const form       = document.getElementById('listingForm-'  + section);
    const editIdEl   = document.getElementById('editId-'       + section);
    const showBtn    = document.getElementById('showFormBtn-'  + section);
    const cancelBtn  = document.getElementById('cancelForm-'   + section);
    const grid       = document.getElementById('listings-'     + section);
    const photoInput = document.getElementById('photoInput-'   + section);
    const btnChoose  = document.getElementById('photoBtnChoose-'  + section);
    const btnReplace = document.getElementById('photoBtnReplace-' + section);
    const btnRemove  = document.getElementById('photoBtnRemove-'  + section);
    const photoError = document.getElementById('photo-error-'  + section);

    function showPhotoError(key) {
        if (photoError) { photoError.textContent = t(key); photoError.classList.add('visible'); }
    }
    function clearPhotoError() {
        if (photoError) { photoError.textContent = ''; photoError.classList.remove('visible'); }
    }

    function openForm(forAdd = true) {
        updateListingFormTranslations(section, forAdd ? 'add' : 'edit');
        formWrap.classList.remove('hidden');
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeForm() {
        form.reset();
        editIdEl.value = '';
        clearErrors(form);
        resetPendingPhoto(section);
        formWrap.classList.add('hidden');
    }

    // Photo button handlers
    btnChoose?.addEventListener('click',  () => photoInput?.click());
    btnReplace?.addEventListener('click', () => photoInput?.click());
    btnRemove?.addEventListener('click',  () => {
        pendingPhotoChange[section] = null;
        updatePhotoPreview(section, null);
        clearPhotoError();
        if (photoInput) photoInput.value = '';
    });

    photoInput?.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;
        clearPhotoError();
        const err = validateImageFile(file);
        if (err) { showPhotoError(err); photoInput.value = ''; return; }
        try {
            const dataUrl = await readImageFile(file);
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve();
                img.onerror = () => reject(new Error('unreadable'));
                img.src = dataUrl;
            });
            const resized   = await resizeImage(dataUrl);
            const mimeMatch = resized.match(/^data:([^;]+);/);
            pendingPhotoChange[section] = {
                source:   'local',
                dataUrl:  resized,
                fileName: file.name,
                mimeType: mimeMatch ? mimeMatch[1] : file.type,
            };
            updatePhotoPreview(section, resized);
        } catch {
            showPhotoError('photo.error.read');
            photoInput.value = '';
        }
    });

    showBtn?.addEventListener('click', () => {
        if (!formWrap.classList.contains('hidden')) { closeForm(); return; }
        editIdEl.value = '';
        form.reset();
        clearErrors(form);
        pendingPhotoChange[section] = undefined;
        updatePhotoPreview(section, null);
        openForm(true);
        const clSel = document.getElementById(section + '-contentLanguage');
        if (clSel) clSel.value = document.documentElement.lang || 'en';
    });

    cancelBtn?.addEventListener('click', closeForm);

    form?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validateForm(form)) return;

        const fd  = new FormData(form);
        const obj = {};
        fd.forEach((v, k) => { obj[k] = v.trim(); });

        const editId  = editIdEl.value;
        const pending = pendingPhotoChange[section];

        if (pending && pending !== null) {
            if (typeof pending.dataUrl !== 'string' || !pending.dataUrl.startsWith('data:image/')) {
                showPhotoError('photo.error.read');
                return;
            }
        }

        // ── API mode ──────────────────────────────────────────────────────────
        if (window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.has(section)) {
            try {
                let photoUrl = null;
                if (editId) {
                    const existing = (apiListingsCache[section] ?? []).find(d => d.id === editId);
                    if (pending === null) {
                        photoUrl = null;
                    } else if (pending !== undefined) {
                        photoUrl = await window.PetFriendsListingsDataSource.apiUploadPhoto(
                            pending.dataUrl, pending.fileName, pending.mimeType);
                    } else {
                        photoUrl = existing?.photoUrl ?? null;
                    }
                    await window.PetFriendsListingsDataSource.apiUpdateListing(
                        section, editId, buildApiPayload(section, obj, photoUrl));
                    showToast(t('toast.listing.updated'));
                } else {
                    if (pending && pending !== null) {
                        photoUrl = await window.PetFriendsListingsDataSource.apiUploadPhoto(
                            pending.dataUrl, pending.fileName, pending.mimeType);
                    }
                    await window.PetFriendsListingsDataSource.apiCreateListing(
                        section, buildApiPayload(section, obj, photoUrl));
                    showToast(t('toast.listing.saved'));
                }
                closeForm();
                await refreshSectionFromApi(section);
            } catch (err) {
                console.error(`[${section}] Save failed:`, err.message);
                showToast(t('error.save'));
            }
            return;
        }

        // ── localStorage mode (Lost / ForHome / Adopt) ────────────────────────
        const data = load(section);
        try {
            if (editId) {
                const idx = data.findIndex(d => d.id === editId);
                if (idx !== -1) {
                    let finalPhoto;
                    if (pending === null)           finalPhoto = null;
                    else if (pending !== undefined) finalPhoto = { ...pending };
                    else                            finalPhoto = data[idx].photo ?? null;
                    data[idx] = { ...data[idx], ...obj, photo: finalPhoto };
                    save(section, data);
                    showToast(t('toast.listing.updated'));
                }
            } else {
                const finalPhoto = (pending && pending !== null) ? { ...pending } : null;
                const newItem = { ...obj, id: genId(), createdAt: Date.now(), photo: finalPhoto };
                data.unshift(newItem);
                save(section, data);
                showToast(t('toast.listing.saved'));
            }
            closeForm();
            renderListings(section);
            updateStats();
        } catch (err) {
            if (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                showPhotoError('error.storage');
            } else {
                showPhotoError('error.save');
            }
        }
    });

    grid?.addEventListener('click', async e => {
        const editBtn    = e.target.closest('[data-action="edit"]');
        const deleteBtn  = e.target.closest('[data-action="delete"]');
        const detailsBtn = e.target.closest('[data-action="details"]');

        if (detailsBtn) {
            openListingDetailsModal(section, detailsBtn.dataset.id);
            return;
        }

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm(t('confirm.delete.listing'))) return;
            if (window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.has(section)) {
                try {
                    await window.PetFriendsListingsDataSource.apiDeleteListing(section, id);
                    await refreshSectionFromApi(section);
                    showToast(t('toast.listing.deleted'));
                } catch (err) {
                    console.error(`[${section}] Delete failed:`, err.message);
                    showToast(t('error.save'));
                }
            } else {
                const updated = load(section).filter(d => d.id !== id);
                save(section, updated);
                renderListings(section);
                updateStats();
                showToast(t('toast.listing.deleted'));
            }
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
            pendingPhotoChange[section] = undefined;
            updatePhotoPreview(section, item.photo ? getPhotoSource(item) : null);
            openForm(false);
        }
    });

    // Filters/search/sort reload the section from the API with the new
    // query params. Text inputs are debounced; selects reload immediately.
    const filters        = getSectionFilters(section);
    const reloadNow       = () => refreshSectionFromApi(section);
    const reloadDebounced = debounce(reloadNow, 300);

    document.getElementById('search-' + section)?.addEventListener('input', e => {
        filters.q = e.target.value.trim();
        reloadDebounced();
    });

    document.getElementById('filter-type-' + section)?.addEventListener('change', e => {
        filters.petType = e.target.value;
        reloadNow();
    });

    document.getElementById('filter-city-' + section)?.addEventListener('input', e => {
        filters.city = e.target.value.trim();
        reloadDebounced();
    });

    document.getElementById('filter-status-' + section)?.addEventListener('change', e => {
        filters.status = e.target.value;
        reloadNow();
    });

    document.getElementById('filter-sort-' + section)?.addEventListener('change', e => {
        filters.sort = e.target.value || 'newest';
        reloadNow();
    });

    document.getElementById('clearFilters-' + section)?.addEventListener('click', () => {
        Object.assign(filters, { q: '', petType: '', city: '', status: '', sort: 'newest' });
        const searchEl = document.getElementById('search-' + section);
        const typeEl   = document.getElementById('filter-type-' + section);
        const cityEl   = document.getElementById('filter-city-' + section);
        const statusEl = document.getElementById('filter-status-' + section);
        const sortEl   = document.getElementById('filter-sort-' + section);
        if (searchEl) searchEl.value = '';
        if (typeEl)   typeEl.value   = '';
        if (cityEl)   cityEl.value   = '';
        if (statusEl) statusEl.value = '';
        if (sortEl)   sortEl.value   = 'newest';
        reloadNow();
    });

    document.getElementById('loadMoreBtn-' + section)?.addEventListener('click', () => {
        refreshSectionFromApi(section, { append: true });
    });
}

// ===== LISTING DETAILS MODAL =====
// Shared overlay (#listingDetailsOverlay) used by all four API-backed listing
// sections. GET /api/listings/:id is fetched on open; a request token guards
// against stale responses if the user opens a different listing (or closes
// the modal) before the first fetch resolves.

let detailsRequestId  = 0;
let detailsCurrentKey = null; // `${section}:${id}` of the listing currently open/loading

function detailsFieldRow(labelKey, valueHtml) {
    return `<div class="card-field"><dt>${esc(t(labelKey))}</dt><dd>${valueHtml}</dd></div>`;
}

function renderListingDetailsBody(section, item) {
    const localTitle       = getLocalizedField(item, 'title');
    const localDesc        = getLocalizedField(item, 'description');
    const photoSrc         = getPhotoSource(item);
    const photoAlt         = esc(localTitle || t('photo.alt.generic'));
    const contentLang      = item.contentLanguage ?? 'en';
    const contentDirClass  = contentLang === 'he' ? 'user-content-rtl' : 'user-content-ltr';
    const dateKey = section === 'found' ? 'card.dateFound'
                  : section === 'lost'  ? 'card.dateLost'
                  : 'card.datePosted';

    const rows = [];
    rows.push(detailsFieldRow('card.scenario', esc(t('nav.' + section))));
    if (item.type)  rows.push(detailsFieldRow('card.petType', esc(tType(item.type))));
    if (item.breed) rows.push(detailsFieldRow('card.breed', esc(item.breed)));
    if (item.city)  rows.push(detailsFieldRow('card.city', `<span class="${contentDirClass}">${esc(item.city)}</span>`));
    if (item.date)  rows.push(detailsFieldRow(dateKey, fmtDate(item.date)));
    if (item.createdAt) rows.push(detailsFieldRow('card.createdDate', fmtTimestamp(item.createdAt)));
    if (item.updatedAt) rows.push(detailsFieldRow('card.updatedDate', fmtTimestamp(item.updatedAt)));

    const contactRows = [];
    if (item.email) contactRows.push(detailsFieldRow('card.contactEmail', `<a class="ltr-value" href="mailto:${esc(item.email)}">${esc(item.email)}</a>`));
    if (item.phone) contactRows.push(detailsFieldRow('card.contactPhone', `<span class="ltr-value"><a href="tel:${esc(item.phone)}">${esc(item.phone)}</a></span>`));

    return `
        <div class="details-image">
            <img src="${esc(photoSrc)}" alt="${photoAlt}"
                 onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='${PHOTO_PLACEHOLDER}'}">
        </div>
        <div class="card-header">
            <div class="card-title"><span class="${contentDirClass}">${esc(localTitle)}</span></div>
            <span class="badge badge-status-${esc(item.status?.toLowerCase())}">${esc(tStatus(item.status))}</span>
        </div>
        <dl class="details-grid card-fields">${rows.join('')}</dl>
        <div class="details-meta">
            <span class="card-field-label">${esc(t('card.description'))}</span>
            <p class="${contentDirClass}">${esc(localDesc || t('card.noDescription'))}</p>
        </div>
        ${contactRows.length ? `
        <div class="details-contact">
            <h3>${esc(t('modal.contact'))}</h3>
            <dl class="card-fields">${contactRows.join('')}</dl>
        </div>` : ''}
    `;
}

function openListingDetailsModal(section, id) {
    const overlay = document.getElementById('listingDetailsOverlay');
    const body    = document.getElementById('listingDetailsBody');
    if (!overlay || !body) return;

    const key = section + ':' + id;
    if (detailsCurrentKey === key && !overlay.classList.contains('hidden')) return; // guard rapid duplicate clicks
    detailsCurrentKey = key;

    overlay.classList.remove('hidden');
    document.body.classList.add('modal-open');
    body.innerHTML = `<div class="details-loading">${esc(t('modal.loading'))}</div>`;

    const myRequestId = ++detailsRequestId;

    window.PetFriendsListingsDataSource.apiGetListingById(section, id)
        .then(item => {
            if (myRequestId !== detailsRequestId) return; // stale — modal moved on or closed
            if (!item) {
                body.innerHTML = `<div class="details-error">${esc(t('error.listingNotFound'))}</div>`;
                return;
            }
            body.innerHTML = renderListingDetailsBody(section, item);
        })
        .catch(err => {
            if (myRequestId !== detailsRequestId) return;
            console.error(`[${section}] Failed to load listing details:`, err.message);
            body.innerHTML = `<div class="details-error">${esc(t('error.listingDetails'))}</div>`;
        });
}

function closeListingDetailsModal() {
    const overlay = document.getElementById('listingDetailsOverlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    overlay.classList.add('hidden');
    document.body.classList.remove('modal-open');
    detailsCurrentKey = null;
    detailsRequestId++; // invalidate any in-flight request
}

// ===== STORIES =====

function renderStories() {
    const data   = storiesCache;
    const grid   = document.getElementById('listings-stories');
    const empty  = document.getElementById('empty-stories');
    const search = (document.getElementById('search-stories')?.value ?? '').toLowerCase();
    const catVal = document.getElementById('filter-cat-stories')?.value ?? '';

    const filtered = data.filter(item => {
        const txt = (item.title + ' ' + item.text).toLowerCase();
        const category = getStoryCategory(item.id);
        return (!search || txt.includes(search))
            && (!catVal || category === catVal);
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    grid.innerHTML = filtered.map(item => {
        const category = getStoryCategory(item.id);
        return `
        <div class="listing-card stories">
            ${item.mediaUrl ? `<img class="card-media" src="${esc(item.mediaUrl)}" alt="${esc(item.title)}" loading="lazy" onerror="this.remove()">` : ''}
            <div class="card-header">
                <div class="card-title">${esc(item.title)}</div>
                ${category ? `<span class="badge story-cat-${esc(category.toLowerCase())}">${esc(tCat(category))}</span>` : ''}
            </div>
            <div class="card-meta"><span>📅 ${fmtDate(item.date)}</span></div>
            <p class="card-desc">${esc(item.text)}</p>
            <div class="card-actions">
                <button class="btn btn-edit"   data-action="edit"   data-id="${esc(item.id)}">${t('btn.edit')}</button>
                <button class="btn btn-delete" data-action="delete" data-id="${esc(item.id)}">${t('btn.delete')}</button>
            </div>
        </div>
        `;
    }).join('');
}

function setupStoriesSection() {
    const formWrap   = document.getElementById('form-stories');
    const form       = document.getElementById('listingForm-stories');
    const formTitle  = document.getElementById('form-title-stories');
    const editIdEl   = document.getElementById('editId-stories');
    const showBtn    = document.getElementById('showFormBtn-stories');
    const cancelBtn  = document.getElementById('cancelForm-stories');
    const grid       = document.getElementById('listings-stories');
    const photoInput = document.getElementById('photoInput-stories');
    const btnChoose  = document.getElementById('photoBtnChoose-stories');
    const btnReplace = document.getElementById('photoBtnReplace-stories');
    const btnRemove  = document.getElementById('photoBtnRemove-stories');
    const photoError = document.getElementById('photo-error-stories');

    function showPhotoError(key) {
        if (photoError) { photoError.textContent = t(key); photoError.classList.add('visible'); }
    }
    function clearPhotoError() {
        if (photoError) { photoError.textContent = ''; photoError.classList.remove('visible'); }
    }

    function openForm(forAdd = true) {
        formTitle.textContent = forAdd ? t('form.add.stories') : t('form.edit.stories');
        formWrap.classList.remove('hidden');
        formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function closeForm() {
        form.reset();
        editIdEl.value = '';
        clearErrors(form);
        resetPendingPhoto('stories');
        formWrap.classList.add('hidden');
    }

    // Photo button handlers — reuses the same generic photo pipeline as listings.
    btnChoose?.addEventListener('click',  () => photoInput?.click());
    btnReplace?.addEventListener('click', () => photoInput?.click());
    btnRemove?.addEventListener('click',  () => {
        pendingPhotoChange['stories'] = null;
        updatePhotoPreview('stories', null);
        clearPhotoError();
        if (photoInput) photoInput.value = '';
    });

    photoInput?.addEventListener('change', async () => {
        const file = photoInput.files[0];
        if (!file) return;
        clearPhotoError();
        const err = validateImageFile(file);
        if (err) { showPhotoError(err); photoInput.value = ''; return; }
        try {
            const dataUrl = await readImageFile(file);
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve();
                img.onerror = () => reject(new Error('unreadable'));
                img.src = dataUrl;
            });
            const resized   = await resizeImage(dataUrl);
            const mimeMatch = resized.match(/^data:([^;]+);/);
            pendingPhotoChange['stories'] = {
                source:   'local',
                dataUrl:  resized,
                fileName: file.name,
                mimeType: mimeMatch ? mimeMatch[1] : file.type,
            };
            updatePhotoPreview('stories', resized);
        } catch {
            showPhotoError('photo.error.read');
            photoInput.value = '';
        }
    });

    showBtn?.addEventListener('click', () => {
        if (!formWrap.classList.contains('hidden')) { closeForm(); return; }
        editIdEl.value = '';
        form.reset();
        clearErrors(form);
        pendingPhotoChange['stories'] = undefined;
        updatePhotoPreview('stories', null);
        openForm(true);
    });

    cancelBtn?.addEventListener('click', closeForm);

    form?.addEventListener('submit', async e => {
        e.preventDefault();
        if (!validateForm(form)) return;

        const fd  = new FormData(form);
        const obj = {};
        fd.forEach((v, k) => { obj[k] = v.trim(); });

        const editId  = editIdEl.value;
        const pending = pendingPhotoChange['stories'];

        if (pending && pending !== null) {
            if (typeof pending.dataUrl !== 'string' || !pending.dataUrl.startsWith('data:image/')) {
                showPhotoError('photo.error.read');
                return;
            }
        }

        try {
            let mediaUrl = null;
            if (editId) {
                const existing = storiesCache.find(d => d.id === editId);
                if (pending === null) {
                    mediaUrl = null;
                } else if (pending !== undefined) {
                    mediaUrl = await window.PetFriendsStoriesDataSource.uploadStoryPhoto(
                        pending.dataUrl, pending.fileName, pending.mimeType);
                } else {
                    mediaUrl = existing?.mediaUrlRelative ?? null;
                }
                await window.PetFriendsStoriesDataSource.updateStory(
                    editId, buildStoryApiPayload(obj, mediaUrl));
                setStoryCategory(editId, obj.category || '');
                showToast(t('toast.story.updated'));
            } else {
                if (pending && pending !== null) {
                    mediaUrl = await window.PetFriendsStoriesDataSource.uploadStoryPhoto(
                        pending.dataUrl, pending.fileName, pending.mimeType);
                }
                const created = await window.PetFriendsStoriesDataSource.createStory(
                    buildStoryApiPayload(obj, mediaUrl));
                setStoryCategory(created.id, obj.category || '');
                showToast(t('toast.story.saved'));
            }
            closeForm();
            await refreshStoriesFromApi();
        } catch (err) {
            console.error('[stories] Save failed:', err.message);
            showToast(t('error.save'));
        }
    });

    grid?.addEventListener('click', async e => {
        const editBtn   = e.target.closest('[data-action="edit"]');
        const deleteBtn = e.target.closest('[data-action="delete"]');

        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (!confirm(t('confirm.delete.story'))) return;
            try {
                await window.PetFriendsStoriesDataSource.deleteStory(id);
                deleteStoryCategory(id);
                await refreshStoriesFromApi();
                showToast(t('toast.story.deleted'));
            } catch (err) {
                console.error('[stories] Delete failed:', err.message);
                showToast(t('error.save'));
            }
        }

        if (editBtn) {
            const id   = editBtn.dataset.id;
            const item = storiesCache.find(d => d.id === id);
            if (!item) return;
            editIdEl.value = id;
            form.reset();
            clearErrors(form);
            if (form.elements['title']) form.elements['title'].value = item.title ?? '';
            if (form.elements['text'])  form.elements['text'].value  = item.text  ?? '';
            if (form.elements['category']) form.elements['category'].value = getStoryCategory(id);
            pendingPhotoChange['stories'] = undefined;
            updatePhotoPreview('stories', item.mediaUrl || null);
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
    form.querySelectorAll('.field-error:not([id])').forEach(el => el.remove());
}

// ===== STATS =====

function updateStats() {
    ['found', 'lost', 'forHome', 'adopt'].forEach(s => {
        const el = document.getElementById('stat-' + s);
        if (!el) return;
        // API sections only load LISTINGS_PAGE_SIZE items at a time, so the
        // cache length no longer reflects the true count — use the backend
        // pagination total instead.
        el.textContent = window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.has(s)
            ? getSectionPagination(s).total
            : load(s).length;
    });
    const storiesEl = document.getElementById('stat-stories');
    if (storiesEl) storiesEl.textContent = storiesCache.length;
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

// ===== I18N DATA UPGRADE =====

const I18N_UPGRADE_KEY = 'pf_i18n_v1';

function upgradeSeededData() {
    if (localStorage.getItem(I18N_UPGRADE_KEY)) return;

    const i18nPatch = {
        'finder@example.com': {
            titleI18n: { en: 'Orange tabby cat', ru: 'Рыжий полосатый кот', he: 'חתול ג\'ינג\'י מפוספס' },
            descriptionI18n: {
                en: 'Found near Central Park. Very friendly, has no collar. Eating well. Please contact if this is your cat!',
                ru: 'Найден возле Центрального парка. Очень дружелюбный, без ошейника. Хорошо ест. Свяжитесь, если это ваш кот!',
                he: 'נמצא ליד סנטרל פארק. ידידותי מאוד וללא קולר. אוכל היטב. צרו קשר אם זה החתול שלכם!',
            },
        },
        'goodsam@example.com': {
            titleI18n: { en: 'Small white terrier', ru: 'Маленький белый терьер', he: 'טרייר לבן קטן' },
            descriptionI18n: {
                en: 'Found wandering near Pine Street. Blue collar, no tags. Well-behaved and house-trained.',
                ru: 'Найден бродящим возле Pine Street. Синий ошейник, без жетона. Хорошо воспитан и приучен к дому.',
                he: 'נמצא משוטט ליד רחוב פיין. קולר כחול, ללא תג זיהוי. מחונך ומורגל לבית.',
            },
        },
        'birdfinder@example.com': {
            titleI18n: { en: 'Green parakeet', ru: 'Зелёный попугай', he: 'תוכון ירוק' },
            descriptionI18n: {
                en: 'Landed on my balcony this morning. Seems tame and trained. Responds to whistling.',
                ru: 'Сегодня утром прилетел на балкон. Похоже, ручной и обученный. Реагирует на свист.',
                he: 'נחת הבוקר במרפסת שלי. נראה מאולף ומורגל לבני אדם. מגיב לשריקות.',
            },
        },
        'maxowner@example.com': {
            titleI18n: { en: 'Max — Golden Retriever', ru: 'Макс — Золотистый ретривер', he: 'מקס — גולדן רטריבר' },
            descriptionI18n: {
                en: 'Max is 3 years old. Lost near Riverside Park. Red collar with ID tag. Very friendly. Reward offered!',
                ru: 'Максу 3 года. Потерялся возле Riverside Park. Красный ошейник с адресником. Очень дружелюбный. Вознаграждение!',
                he: 'מקס בן 3. אבד ליד פארק ריברסייד. קולר אדום עם תג זיהוי. ידידותי מאוד. תגמול יוענק!',
            },
        },
        'lunafamily@example.com': {
            titleI18n: { en: 'Luna — Black cat', ru: 'Луна — Чёрная кошка', he: 'לונה — חתולה שחורה' },
            descriptionI18n: {
                en: 'Luna is 2 years old, fully black with green eyes. She is microchipped. Last seen near Oak Street.',
                ru: 'Луне 2 года, полностью чёрная с зелёными глазами. Вживлён чип. Последний раз видели возле Oak Street.',
                he: 'לונה בת 2, שחורה לחלוטין עם עיניים ירוקות. מושתלת שבב. נראתה לאחרונה ליד רחוב אוק.',
            },
        },
        'whiskers@example.com': {
            titleI18n: { en: 'Whiskers — 4yr tabby', ru: 'Вискерс — полосатый кот, 4 года', he: 'ויסקרס — חתול מפוספס בן 4' },
            descriptionI18n: {
                en: 'Sweet 4-year-old tabby who loves cuddles. Owner is moving abroad. Neutered, vaccinated, very healthy.',
                ru: 'Ласковый полосатый кот 4 лет. Хозяин переезжает за границу. Кастрирован, привит, здоров.',
                he: 'חתול מפוספס חמוד בן 4 שאוהב חיבוקים. הבעלים עובר לחו"ל. מסורס, מחוסן, בריא מאוד.',
            },
        },
        'buddyadopt@example.com': {
            titleI18n: { en: 'Buddy — 2yr Beagle mix', ru: 'Бадди — бигль-метис, 2 года', he: 'באדי — מיקס ביגל בן 2' },
            descriptionI18n: {
                en: 'Energetic 2-year-old beagle mix. Great with kids! Needs a yard. Owner relocating for work.',
                ru: 'Энергичный бигль-метис 2 лет. Отлично ладит с детьми! Нужен двор. Хозяин переезжает.',
                he: 'מיקס ביגל אנרגטי בן 2. מעולה עם ילדים! צריך חצר. הבעלים עובר בגלל עבודה.',
            },
        },
        'bunny@example.com': {
            titleI18n: { en: 'Snowflake — Holland Lop rabbit', ru: 'Снежинка — карликовый вислоухий кролик', he: 'שלגית — ארנב הולנד לופ' },
            descriptionI18n: {
                en: 'Beautiful white Holland Lop rabbit. Very calm, litter trained. Comes with cage and all supplies.',
                ru: 'Красивый белый вислоухий кролик. Очень спокойный, приучен к лотку. С клеткой и принадлежностями.',
                he: 'ארנב הולנד לופ לבן ויפה. רגוע מאוד, מאולף לשטיח. מגיע עם כלוב וכל הציוד.',
            },
        },
        'adopter1@example.com': {
            titleI18n: { en: 'Looking for a calm senior cat', ru: 'Ищем спокойную пожилую кошку', he: 'מחפשים חתול מבוגר ורגוע' },
            descriptionI18n: {
                en: 'Retired couple with quiet home. Lots of time and love to give. Previous cat owners, experienced.',
                ru: 'Пенсионная пара с тихим домом. Много времени и любви. Бывшие владельцы кошек, с опытом.',
                he: 'זוג פנסיונרים עם בית שקט. הרבה זמן ואהבה לתת. בעלי חתולים לשעבר, עם ניסיון.',
            },
        },
        'family@example.com': {
            titleI18n: { en: 'Family wants a medium-size dog', ru: 'Семья ищет собаку среднего размера', he: 'משפחה מחפשת כלב בגודל בינוני' },
            descriptionI18n: {
                en: 'Family of 4 with backyard looking for a friendly, active dog. We hike, bike, and love the outdoors!',
                ru: 'Семья из 4 человек с двором ищет активную собаку. Ходим в походы, ездим на велосипеде!',
                he: 'משפחה של 4 עם חצר מחפשת כלב ידידותי ופעיל. אנחנו מטיילים, רוכבים על אופניים ואוהבים טבע!',
            },
        },
    };

    ['found', 'lost', 'forHome', 'adopt'].forEach(section => {
        const data = load(section);
        let changed = false;
        data.forEach(item => {
            const patch = item.email && i18nPatch[item.email];
            if (patch && !item.titleI18n) {
                Object.assign(item, patch);
                changed = true;
            }
        });
        if (changed) save(section, data);
    });

    localStorage.setItem(I18N_UPGRADE_KEY, '1');
}

// ===== SEED PHOTO UPGRADE =====

const PHOTO_UPGRADE_KEY = 'pf_photo_v2';

async function assetExists(url) {
    if (location.protocol === 'file:') return false;
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok;
    } catch {
        return false;
    }
}

async function upgradeSeedPhotos() {
    if (localStorage.getItem(PHOTO_UPGRADE_KEY)) return;

    const assetPhotos = {
        'finder@example.com':  { section: 'found',   url: 'assets/images/found-sample.webp'    },
        'maxowner@example.com':{ section: 'lost',    url: 'assets/images/lost-sample.webp'     },
        'whiskers@example.com':{ section: 'forHome', url: 'assets/images/for-home-sample.webp' },
        'adopter1@example.com':{ section: 'adopt',   url: 'assets/images/adopt-sample.webp'    },
    };

    // Sections already served by the backend API (see API_ENABLED_SECTIONS)
    // never render this localStorage-seeded data, so probing their sample
    // image URLs would only produce console 404s for no benefit.
    const urls = [...new Set(
        Object.values(assetPhotos)
            .filter(p => !window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.has(p.section))
            .map(p => p.url)
    )];
    const existsMap = {};
    await Promise.all(urls.map(async url => {
        existsMap[url] = await assetExists(url);
    }));

    ['found', 'lost', 'forHome', 'adopt'].forEach(sec => {
        const data = load(sec);
        let changed = false;
        data.forEach(item => {
            const patch = item.email && assetPhotos[item.email];
            if (!patch || patch.section !== sec) return;

            const isSeededAsset = item.photo?.source === 'asset' && item.photo?.url === patch.url;
            if (!item.photo) {
                item.photo = existsMap[patch.url] ? { source: 'asset', url: patch.url } : null;
                changed = true;
            } else if (isSeededAsset && !existsMap[patch.url]) {
                item.photo = null;
                changed = true;
            }
        });
        if (changed) {
            try { save(sec, data); } catch { /* quota – skip silently for seed */ }
        }
    });

    localStorage.setItem(PHOTO_UPGRADE_KEY, '1');
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', async () => {
    seedSampleData();
    upgradeSeededData();
    await upgradeSeedPhotos();

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

    // Retry button inside a section's error message — reloads just that section
    document.addEventListener('click', e => {
        const btn = e.target.closest('.retry-button[data-retry-section]');
        if (!btn) return;
        const section = btn.dataset.retrySection;
        if (section === 'stories') refreshStoriesFromApi();
        else refreshSectionFromApi(section);
    });

    // Listing details modal — close via X, overlay background click, or Escape
    document.getElementById('listingDetailsClose')?.addEventListener('click', closeListingDetailsModal);
    document.getElementById('listingDetailsOverlay')?.addEventListener('click', e => {
        if (e.target.id === 'listingDetailsOverlay') closeListingDetailsModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeListingDetailsModal();
    });

    // Set up listing sections (event listeners; initial render happens inside initLanguage)
    ['found', 'lost', 'forHome', 'adopt'].forEach(s => setupListingSection(s));
    setupStoriesSection();
    setupContact();
    updateStats();

    // Apply saved/default language — triggers the first render of all cards
    initLanguage();

    showSection('home');

    // Load API-enabled sections from backend — non-blocking, runs after first paint.
    window.PetFriendsListingsDataSource.API_ENABLED_SECTIONS.forEach(s => refreshSectionFromApi(s));
    refreshStoriesFromApi();
});
