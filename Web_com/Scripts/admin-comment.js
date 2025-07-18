$(document).ready(function () {
    let currentFilter = null; // null: All, 'approved': Approved, 'unapproved': Unapproved
    let currentPage = 1;
    let rowsPerPage = parseInt($('#page-size-select').val()) || 5;
    const token = $('input[name="__RequestVerificationToken"]').val();

    // -----------------------------
    // LỌC THEO TRẠNG THÁI (All / Approved / Unapproved)
    // -----------------------------
    function applyStatusFilter(status) {
        currentFilter = status === currentFilter ? null : status;

        $('.comment-row').each(function () {
            const isApproved = $(this).attr('data-is-approved') === 'true';
            const match =
                !currentFilter ||
                (currentFilter === 'approved' && isApproved) ||
                (currentFilter === 'unapproved' && !isApproved);
            $(this).toggleClass('filtered-out', !match);
        });

        $('.filter-btn').removeClass('active');
        $(`#filter-${currentFilter || 'all'}`).addClass('active');

        refreshPaginationAfterFilter();
    }

    $('#filter-all').on('click', () => applyStatusFilter(null));
    $('#filter-approved').on('click', () => applyStatusFilter('approved'));
    $('#filter-unapproved').on('click', () => applyStatusFilter('unapproved'));

    // -----------------------------
    // Tìm kiếm theo tên người dùng và tên truyện
    // -----------------------------
    function filterComments() {
        const nameFilter = $('#search-name').val().toLowerCase();
        const workFilter = $('#search-work').val().toLowerCase();

        $('.comment-row').each(function () {
            const username = String($(this).attr('data-username') || '').toLowerCase();
            const workName = String($(this).attr('data-work') || '').toLowerCase();
            const isApproved = $(this).attr('data-is-approved') === 'true';
            const matchName = username.includes(nameFilter);
            const matchWork = workName.includes(workFilter);
            const matchStatus =
                !currentFilter ||
                (currentFilter === 'approved' && isApproved) ||
                (currentFilter === 'unapproved' && !isApproved);
            const match = matchName && matchWork && matchStatus;

            $(this).toggleClass('filtered-out', !match);
        });

        refreshPaginationAfterFilter();
    }

    $('#search-name').on('input', function () {
        filterComments();
    });

    $('#search-work').on('input', function () {
        filterComments();
    });

    // -----------------------------
    // Phân trang bình luận
    // -----------------------------
    function paginateComments() {
        const $rows = $('.comment-row').not('.filtered-out');
        const totalRows = $rows.length;
        const totalPages = Math.ceil(totalRows / rowsPerPage);

        if (currentPage > totalPages) currentPage = 1;

        $('.comment-row').hide();
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        $rows.slice(start, end).show();

        $('#page-number-input').val(currentPage);
    }

    $('#prev-page').on('click', function () {
        if (currentPage > 1) {
            currentPage--;
            paginateComments();
        }
    });

    $('#next-page').on('click', function () {
        const totalPages = Math.ceil($('.comment-row').not('.filtered-out').length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            paginateComments();
        }
    });

    let isManuallyChangingPage = false;

    $('#page-number-input').on('input', function () {
        isManuallyChangingPage = true;
    });

    $('#page-number-input').on('change', function () {
        const value = parseInt($(this).val());
        const totalPages = Math.ceil($('.comment-row').not('.filtered-out').length / rowsPerPage);
        if (!isNaN(value) && value >= 1 && value <= totalPages) {
            currentPage = value;
            paginateComments();
        } else {
            $(this).val(currentPage);
        }
        isManuallyChangingPage = false;
    });

    $('#page-size-select').on('change', function () {
        rowsPerPage = parseInt($(this).val());
        currentPage = 1;
        paginateComments();
    });

    function refreshPaginationAfterFilter() {
        if (!isManuallyChangingPage) {
            currentPage = 1;
        }
        paginateComments();
    }

    // -----------------------------
    // Kích hoạt phân trang và lọc ban đầu
    // -----------------------------
    filterComments();
    paginateComments();

    // -----------------------------
    // Duyệt/Hủy duyệt bình luận
    // -----------------------------
    $(document).on('click', '.btn-status:not([disabled])', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $btn = $(this);
        const commentId = $btn.data('comment-id');
        const username = $btn.data('username');
        const isApproving = $btn.hasClass('btn-enable');

        Swal.fire({
            title: `${isApproving ? 'Approve' : 'Unapprove'} comment by ${username}?`,
            text: isApproving ? 'This will make the comment visible to all users.' : 'This will hide the comment from public view.',
            icon: 'warning',
            input: 'password',
            inputPlaceholder: 'Enter your admin password',
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off'
            },
            showCancelButton: true,
            confirmButtonColor: '#ff99cc',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${isApproving ? 'approve' : 'unapprove'} it!`,
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
                    url: '/Admin/ApproveComment',
                    type: 'POST',
                    data: {
                        commentId: commentId,
                        approve: isApproving,
                        __RequestVerificationToken: token
                    },
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    success: function (response) {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success!',
                                text: response.message,
                                confirmButtonColor: '#ff99cc',
                                timer: 3000,
                                timerProgressBar: true,
                                scrollbarPadding: false
                            }).then(() => {
                                $btn.toggleClass('btn-enable btn-disable');
                                $btn.text(isApproving ? 'Unapprove' : 'Approve');
                                $btn.closest('tr').attr('data-is-approved', isApproving.toString().toLowerCase());
                                filterComments(); // Áp dụng lại bộ lọc sau khi thay đổi trạng thái
                                paginateComments();
                            });
                        } else {
                            showError(response.message);
                        }
                    },
                    error: function (xhr) {
                        const errorMsg = xhr.responseJSON?.message || `Error ${isApproving ? 'approving' : 'unapproving'} comment`;
                        showError(errorMsg);
                    }
                });
            }
        });
    });

    // -----------------------------
    // Xóa bình luận
    // -----------------------------
    $('.btn-delete').on('click', function (e) {
        e.preventDefault();
        const commentId = $(this).data('comment-id');
        const username = $(this).data('username');

        Swal.fire({
            title: `Delete comment by ${username}?`,
            html: `This will mark the comment as deleted and hide it from public view.<br><br><b style="color: #ff0000">Please enter your admin password to confirm:</b>`,
            icon: 'warning',
            input: 'password',
            inputPlaceholder: 'Enter your admin password',
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
                    url: '/Admin/DeleteComment',
                    type: 'POST',
                    data: {
                        commentId: commentId,
                        __RequestVerificationToken: token
                    },
                    success: function (response) {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: '#ff99cc',
                                scrollbarPadding: false
                            }).then(() => {
                                $(`tr[data-comment-id="${commentId}"]`).remove();
                                paginateComments();
                            });
                        } else {
                            showError(response.message);
                        }
                    },
                    error: function () {
                        showError('Failed to delete comment');
                    }
                });
            }
        });
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