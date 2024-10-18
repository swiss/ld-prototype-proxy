const search = new URLSearchParams(location.search);

document.querySelectorAll(search.get('role') === 'admin' ? '[data-role=admin]' : '[data-role=user]')
    .forEach(el => el.classList.remove('d-none'));
