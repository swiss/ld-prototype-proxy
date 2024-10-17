const search = new URLSearchParams(location.search);

document.querySelector(search.get('role') === 'admin' ? '#form-admin' : '#form-user')
    .classList.remove('d-none');
