$(document).ready(function () {
    let currentFilter = null;
    let currentPage = 1;
    let rowsPerPage = parseInt($('#page-size-select').val()) || 5;
    const token = $('input[name="__RequestVerificationToken"]').val();

    // -----------------------------
    // LỌC THEO ROLE (Author / Reader)
    // -----------------------------
    function applyRoleFilter(role) {
        currentFilter = role === currentFilter ? null : role;

        $('.user-row').each(function () {
            const isAuthor = $(this).data('is-author') === "True";
            const match =
                !currentFilter ||
                (currentFilter === "author" && isAuthor) ||
                (currentFilter === "reader" && !isAuthor);

            $(this).toggleClass('filtered-out', !match);
        });

        $('.filter-btn').removeClass('active');
        $(`#filter-${currentFilter || 'all'}`).addClass('active');

        refreshPaginationAfterFilter();
    }

    $('#filter-all').on('click', () => applyRoleFilter(null));
    $('#filter-author').on('click', () => applyRoleFilter('author'));
    $('#filter-reader').on('click', () => applyRoleFilter('reader'));

    // -----------------------------
    // Tìm kiếm theo tên hoặc email
    // -----------------------------
    function filterUsers() {
        const nameFilter = $('#search-name').val().toLowerCase();
        const emailFilter = $('#search-email').val().toLowerCase();

        $('.user-row').each(function () {
            const name = $(this).find('td:eq(0)').text().toLowerCase();
            const email = $(this).find('td:eq(1)').text().toLowerCase();

            const match = name.includes(nameFilter) && email.includes(emailFilter);
            $(this).toggleClass('filtered-out', !match);
        });
    }

    $('#search-name, #search-email').on('input', function () {
        filterUsers();
        refreshPaginationAfterFilter();
    });

    // -----------------------------
    // PHÂN TRANG NGƯỚI DÙNG
    // -----------------------------
    function paginateAccounts() {
        const $rows = $('.account-row').not('.filtered-out');
        const totalRows = $rows.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        if (currentPage > totalPages) currentPage = 1;

        $('.account-row').hide();
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        $rows.slice(start, end).show();

        $('#page-number-input').val(currentPage);
    }

    $('#prev-page').on('click', function () {
        console.log('Prev clicked, currentPage:', currentPage); // Debug
        if (currentPage > 1) {
            currentPage--;
            paginateAccounts();
        }
    });

    $('#next-page').on('click', function () {
        const totalPages = Math.ceil($('.account-row').not('.filtered-out').length / rowsPerPage);
        console.log('Next clicked, currentPage:', currentPage, 'totalPages:', totalPages); // Debug
        if (currentPage < totalPages) {
            currentPage++;
            paginateAccounts();
        }
    });

    let isManuallyChangingPage = false;

    $('#page-number-input').on('input', function () {
        isManuallyChangingPage = true;
    });

    $('#page-number-input').on('change', function () {
        const value = parseInt($(this).val());
        const totalPages = Math.ceil($('.account-row').not('.filtered-out').length / rowsPerPage);
        if (!isNaN(value) && value >= 1 && value <= totalPages) {
            currentPage = value;
            paginateAccounts();
        } else {
            $(this).val(currentPage);
        }
        isManuallyChangingPage = false;
    });

    $('#page-size-select').on('change', function () {
        rowsPerPage = parseInt($(this).val());
        currentPage = 1;
        paginateAccounts();
    });

    function refreshPaginationAfterFilter() {
        if (!isManuallyChangingPage) {
            currentPage = 1;
        }
        paginateAccounts();
    }
    // -----------------------------
    // Kích hoạt phân trang ban đầu
    // -----------------------------
    filterUsers();
    paginateAccounts();

    // -----------------------------
    // Enable/Disable người dùng
    // -----------------------------
    $(document).on('click', '.btn-status:not([disabled])', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $btn = $(this);
        const usersId = $btn.data('users-id');
        const usersName = $btn.data('users-name');
        const isEnabling = $btn.hasClass('btn-enable');

        Swal.fire({
            title: `${isEnabling ? 'Enable' : 'Disable'} ${usersName}?`,
            text: isEnabling ? 'This will allow the user to log in again.' : 'This will prevent the user from logging in.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff99cc',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${isEnabling ? 'enable' : 'disable'} it!`,
            scrollbarPadding: false
        }).then((result) => {
            if (result.isConfirmed) {
                const action = isEnabling ? 'EnableUser' : 'DisableUser';
                $.ajax({
                    url: `/Admin/${action}`,
                    type: 'POST',
                    data: {
                        usersId: usersId,
                        __RequestVerificationToken: token
                    },
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        if (response?.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: response.message || `User ${isEnabling ? 'enabled' : 'disabled'} successfully`,
                                confirmButtonColor: '#ff99cc',
                                timer: 3000,
                                timerProgressBar: true,
                                scrollbarPadding: false
                            }).then(() => {
                                $btn.toggleClass('btn-enable btn-disable');
                                $btn.text(isEnabling ? 'Disable' : 'Enable');
                            });
                        } else {
                            showError(response?.message || 'Unknown error occurred');
                        }
                    },
                    error: function (xhr) {
                        const errorMsg = xhr.responseJSON?.message || `Error ${isEnabling ? 'enabling' : 'disabling'} user`;
                        showError(errorMsg);
                    }
                });
            }
        });
    });

    // -----------------------------
    // Xóa người dùng
    // -----------------------------
    $('.btn-delete').on('click', function (e) {
        e.preventDefault();
        const usersId = $(this).data('users-id');
        const usersName = $(this).data('users-name');
        const isAuthor = $(this).closest('tr').data('is-author') === "True";

        Swal.fire({
            title: `Delete User: ${usersName}?`,
            html: `This will permanently remove the user and all associated data!${isAuthor ? '<br><b style="color: #ff0000; font-size:30px;">All their works will also be deleted!</b>' : ''}<br><br><b style="color: #ff0000">Please enter your admin password to confirm:</b>`,
            icon: 'warning',
            input: 'password',
            inputPlaceholder: 'Enter your password',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonColor: '#ff4d4d',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Confirm Delete',
            scrollbarPadding: false,
            preConfirm: (password) => {
                if (!password) {
                    Swal.showValidationMessage('Password is required');
                } else if (password !== "123") {
                    Swal.showValidationMessage('Incorrect password');
                }
                return password;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/Admin/DeleteUser',
                    type: 'POST',
                    data: {
                        usersId: usersId,
                        __RequestVerificationToken: token
                    },
                    success: function (response) {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#ff99cc'
                            }).then(() => location.reload());
                        } else {
                            showError(response.message);
                        }
                    },
                    error: function () {
                        showError('Failed to delete user');
                    }
                });
            }
        });
    });

    // -----------------------------
    // Xem password
    // -----------------------------
    $(document).on('click', '.btn-eye-toggle', function () {
        const $btn = $(this);
        const $icon = $btn.find('i');
        const $span = $btn.siblings('.masked-password');
        const realPassword = $span.data('real-password');
        const usersName = $btn.data('users-name');

        if ($icon.hasClass('fa-eye')) {
            $span.text('********');
            $icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            Swal.fire({
                title: `View password for User: ${usersName}`,
                html: `<b style="color: #ff0000;">Enter your admin password to see:</b><input type="password" id="adminPassword" class="swal2-input" placeholder="Enter your password">`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff99cc',
                cancelButtonColor: '#d33',
                confirmButtonText: 'View Password',
                scrollbarPadding: false,
                preConfirm: () => {
                    const inputPassword = document.getElementById('adminPassword').value;
                    if (inputPassword !== '123') {
                        Swal.showValidationMessage('Incorrect admin password');
                        return false;
                    }
                    return true;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    $span.text(realPassword);
                    $icon.removeClass('fa-eye-slash').addClass('fa-eye');
                }
            });
        }
    });

    function showError(message) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: '#ff99cc',
            scrollbarPadding: false
        });
    }
});
