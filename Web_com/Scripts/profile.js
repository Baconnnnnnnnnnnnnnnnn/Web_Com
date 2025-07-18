document.addEventListener('DOMContentLoaded', function () {
    // Đảm bảo DOM đã sẵn sàng trước khi khởi tạo
    initProfilePage();
});

let currentSwalInstance = null; // Lưu instance hiện tại của SweetAlert

/**
 * Khởi tạo các sự kiện cho trang Profile
 */
function initProfilePage() {
    // Lấy userId từ URL
    const pathParts = window.location.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    // Sửa lỗi đệ quy khi click ảnh bìa
    $('#coverImageContainer').off('click').on('click', function (e) {
        // Chỉ trigger khi click vào container, không phải input file
        if (e.target === this) {
            $('#coverImageUpload').trigger('click');
        }
    });

    $('#coverImageUpload').off('change').on('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            uploadImage(e.target.files[0], 'cover');
        }
    });

    // Sửa lỗi đệ quy khi click avatar
    $('#avatarContainer').off('click').on('click', function (e) {
        // Chỉ trigger khi click vào container, không phải input file
        if (e.target === this) {
            $('#avatarUpload').trigger('click');
        }
    });

    $('#avatarUpload').off('change').on('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            uploadImage(e.target.files[0], 'avatar');
        }
    });

    // Edit Profile button
    $('.edit-btn').off('click').on('click', showUserDetails);

    // Xử lý nút Follow
    $('.follow-btn').off('click').on('click', function () {
        followAuthor(userId);
    });

    // Xử lý click work card - sử dụng event delegation
    $(document).off('click', '.work-card').on('click', '.work-card', function (e) {
        // Ngăn sự kiện nếu click vào nút Edit hoặc Delete
        if ($(e.target).closest('.work-edit-btn, .work-delete-btn').length) {
            e.stopPropagation(); // Ngăn sự kiện lan truyền lên thẻ cha
            return;
        }

        const workId = $(this).data('work-id');
        if (workId) {
            window.location.href = '/Work/Arc?workId=' + workId;
        }
    });

    

    // Xử lý click tab - sử dụng event delegation
    $('.tab-btn').off('click').on('click', function () {
        const tabIndex = $(this).index();

        $('.tab-btn').removeClass('active');
        $(this).addClass('active');

        const userId = window.location.pathname.split('/').pop();

        switch (tabIndex) {
            case 0: // Works tab
                $('.works-grid').show();
                $('.followers-grid, .following-grid, .favorited-grid').hide();
                break;
            case 1: // Favorited tab
                $('.works-grid, .followers-grid, .following-grid').hide();
                $('.favorited-grid').show();
                loadFavoritedWorks(userId);
                break;
            case 2: // Followers tab
                $('.works-grid, .following-grid, .favorited-grid').hide();
                $('.followers-grid').show();
                loadFollowers(userId);
                break;
            case 3: // Following tab
                $('.works-grid, .followers-grid, .favorited-grid').hide();
                $('.following-grid').show();
                loadFollowing(userId);
                break;
        }
    });
}

/**
 * Upload ảnh lên server
 * @param {File} file - File ảnh cần upload
 * @param {string} type - Loại ảnh ('cover' hoặc 'avatar')
 */
function uploadImage(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    // Hiển thị loading
    const swalInstance = Swal.fire({
        title: 'Uploading...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    // Gọi API upload
    fetch('/Profile/UploadProfileImage', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            swalInstance.close();
            if (data.success) {
                // Cập nhật ảnh mà không gây đệ quy
                const element = type === 'cover' ? $('#coverImageContainer') : $('#avatarContainer');
                element.css('background-image', `url(${data.filePath}?${new Date().getTime()})`);
                Swal.fire('Success', `${type} image updated!`, 'success');
            } else {
                Swal.fire('Error', data.message || 'Upload failed', 'error');
            }
        })
        .catch(error => {
            swalInstance.close();
            Swal.fire('Error', 'Failed to upload image', 'error');
            console.error('Upload error:', error);
        });
}

/**
 * Hiển thị form chỉnh sửa thông tin user
 */
function showUserDetails() {
    fetch('/Profile/GetUserDetails')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const user = data.data;

                currentSwalInstance = Swal.fire({
                    title: 'Edit Profile',
                    html: createEditFormHTML(user),
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: 'Save',
                    cancelButtonText: 'Cancel',
                    preConfirm: () => getFormData(),
                    didOpen: () => initFormEvents()
                }).then((result) => {
                    if (result.isConfirmed && result.value) {
                        updateUserDetails(result.value);
                    }
                    currentSwalInstance = null;
                });
            } else {
                Swal.fire('Error', data.message || 'Failed to fetch user details', 'error');
            }
        })
        .catch(error => {
            Swal.fire('Error', 'Failed to fetch user details', 'error');
            console.error('Fetch user details error:', error);
        });
}

/**
 * Tạo HTML cho form edit
 */
function createEditFormHTML(user) {
    const initialPasswordDisplay = '********';
    const realPassword = user.usersPass || '';
    const masked = realPassword === initialPasswordDisplay;
    return `
        <div class="profile-edit-form">
            <div class="form-group">
                <label>Name</label>
                <input type="text" id="editName" class="swal2-input" value="${escapeHtml(user.usersName || '')}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editEmail" class="swal2-input" value="${escapeHtml(user.usersEmail || '')}">
            </div>
            <div class="form-group password-group">
                <label>Password</label>
                <div class="password-input-container">
                    <input type="password"
                           id="editPassword"
                           class="swal2-input"
                           value="${initialPasswordDisplay}"
                           readonly
                           data-password="${masked ? '' : escapeHtml(realPassword)}">
                    <i class="fas fa-eye-slash toggle-password" id="togglePassword"></i>
                </div>
            </div>
        </div>
    `;
}

/**
 * Hàm để tránh lỗi XSS khi hiển thị dữ liệu
 */
function escapeHtml(text) {
    if (!text) return '';
    var map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, function (m) { return map[m]; });
}

/**
 * Lấy dữ liệu từ form
 */
function getFormData() {
    const name = $('#editName').val() || '';
    const email = $('#editEmail').val() || '';
    const password = $('#editPassword').val() === '********' ? null : $('#editPassword').val();

    if (!name.trim() || !email.trim()) {
        Swal.showValidationMessage('Name and email are required');
        return false;
    }

    return {
        name: name.trim(),
        email: email.trim(),
        password: password
    };
}

/**
 * Khởi tạo sự kiện cho form
 */
function initFormEvents() {
    $('#togglePassword').off('click').on('click', togglePasswordView);
}

/**
 * Hiển thị/ẩn mật khẩu (phiên bản tích hợp từ code mẫu)
 */
function togglePasswordView() {
    const passwordInput = $('#editPassword');
    const icon = $('#togglePassword');
    const isMasked = passwordInput.val() === '********';

    if (isMasked) {
        const realPassword = passwordInput.data('password');
        passwordInput
            .val(realPassword)
            .prop('readonly', false)
            .attr('type', 'text'); // 👈 chuyển sang type text để hiện ra
        icon.removeClass('fa-eye-slash').addClass('fa-eye');
        setTimeout(() => passwordInput.focus(), 100);
    } else {
        passwordInput
            .val('********')
            .prop('readonly', true)
            .attr('type', 'password'); // 👈 chuyển lại về password
        icon.removeClass('fa-eye').addClass('fa-eye-slash');
    }
}

/**
 * Lấy mật khẩu thực từ server (giữ nguyên)
 */
function fetchUserPassword() {
    return fetch('/Profile/GetUserPassword')
        .then(response => {
            if (!response.ok) throw new Error('Failed to retrieve password');
            return response.json();
        })
        .then(data => {
            if (data.success && data.data?.password) {
                return data.data.password;
            }
            throw new Error(data.message || 'Password not found');
        });
}

/**
 * Cập nhật thông tin user
 */
function updateUserDetails(data) {
    if (!data) return;

    const swalInstance = Swal.fire({
        title: 'Updating...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    fetch('/Profile/UpdateUserDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            swalInstance.close();
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Profile updated successfully!',
                    icon: 'success',
                    willClose: () => {
                        // Reload trang sau khi đóng thông báo thành công
                        location.reload();
                    }
                });
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        })
        .catch(error => {
            swalInstance.close();
            Swal.fire('Error', 'Failed to update profile', 'error');
            console.error('Update error:', error);
        });
}
/**
 * Theo dõi/bỏ theo dõi tác giả
 */
let isFollowProcessing = false;
function followAuthor(authorId) {
    console.log('Follow click triggered');
    if (!authorId || isFollowProcessing) return;
    isFollowProcessing = true;

    // Kiểm tra nếu là Guest (sử dụng biến đã định nghĩa từ View)
    if (typeof isGuest !== 'undefined' && isGuest === "true") {
        Swal.fire({
            icon: 'info',
            title: 'Yêu cầu đăng nhập',
            text: 'Bạn cần đăng nhập để theo dõi tác giả',
            showCancelButton: true,
            confirmButtonText: 'Đăng nhập',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/Web_Com/Login';
            }
        });
        return;
    }

    $.ajax({
        url: '/Profile/FollowAuthor',
        type: 'POST',
        data: { authorId },
        success: function (response) {
            if (response.success) {
                setTimeout(() => {
                    // Cập nhật trực tiếp nút follow trên giao diện
                    const $btn = $('.follow-btn');
                    const isFollowing = response.isFollowing;

                    $btn.toggleClass('following', isFollowing);
                    $btn.html(`<i class="fas fa-heart"></i> ${isFollowing ? 'Following' : 'Follow'}`);

                    // Hiển thị thông báo
                    Swal.fire({
                        icon: 'success',
                        title: isFollowing ? 'Followed!' : 'Unfollowed',
                        text: response.message,
                        timer: 1000,
                        showConfirmButton: false
                    }).then(() => {
                        location.reload();
                    });
                }, 100);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: response.message
                });
            }
        },
        error: function () {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Could not process your request'
            });
        }
    });
}

/**
 * Tải danh sách người theo dõi
 */
function loadFollowers(userId) {
    const $container = $('.followers-grid');
    $container.html('<div class="loading">Loading followers...</div>');

    fetch(`/Profile/GetFollowers?id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.data.length > 0) {
                    const isGuestFlag = (typeof isGuest !== 'undefined' && isGuest === 'true');
                    const html = data.data.map(user => `
                        <div class="follower-item" onclick="window.location.href='/Profile/Index/${user.id}${isGuestFlag ? '?guest=true' : ''}'">
                            <div class="follower-avatar" style="background-image: url('${user.avatar ? `/Content/Images/Avatar/${user.avatar}` : '/Content/Images/default-avatar.png'}')"></div>
                            <div class="follower-name">${user.name}</div>
                        </div>
                    `).join('');
                    $container.html(html);
                } else {
                    $container.html('<div class="no-followers">No followers yet</div>');
                }
            } else {
                $container.html('<div class="error">Failed to load followers</div>');
            }
        })
        .catch(error => {
            $container.html('<div class="error">Error loading followers</div>');
            console.error('Error loading followers:', error);
        });
}

function loadFollowing(userId) {
    const $container = $('.following-grid');
    $container.html('<div class="loading">Loading following...</div>');

    fetch(`/Profile/GetFollowing?id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.data.length > 0) {
                    const isGuestFlag = (typeof isGuest !== 'undefined' && isGuest === 'true');
                    const html = data.data.map(user => `
                        <div class="following-item" onclick="window.location.href='/Profile/Index/${user.id}${isGuestFlag ? '?guest=true' : ''}'">
                            <div class="following-avatar" style="background-image: url('${user.avatar ? `/Content/Images/Avatar/${user.avatar}` : '/Content/Images/default-avatar.png'}')"></div>
                            <div class="following-name">${user.name}</div>
                        </div>
                    `).join('');
                    $container.html(html);
                } else {
                    $container.html('<div class="no-following">Not following anyone yet</div>');
                }
            } else {
                $container.html('<div class="error">Failed to load following</div>');
            }
        })
        .catch(error => {
            $container.html('<div class="error">Error loading following</div>');
            console.error('Error loading following:', error);
        });
}

/**
 * 
 * Tải danh sách các tác phẩm đã yêu thích
 */
function loadFavoritedWorks(userId) {
    const $container = $('.favorited-grid');
    $container.html('<div class="loading">Loading favorited works...</div>');

    fetch(`/Profile/GetFavoritedWorks?id=${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.data.length > 0) {
                    const html = data.data.map(work => `
                        <div class="work-grid">
                            <div class="work-card" data-work-id="${work.id}">
                                <div class="work-image" style="background-image: url('/Content/Images/${work.image}')"></div>
                                <div class="work-info">
                                    <div class="work-title">${work.name}</div>
                                    <div class="work-meta">
                                        <span class="work-genre">${work.genre}</span>
                                        <span class="work-status">${work.status}</span>
                                    </div>
                                    <div class="work-stats">
                                        <span><i class="fas fa-heart"></i> ${work.hearts}</span>
                                        <span><i class="fas fa-eye"></i> ${work.views}</span>
                                        <span><i class="fas fa-book"></i> ${work.arcs} Arcs</span>
                                        <span><i class="fas fa-file-alt"></i> ${work.chapters} Chaps</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('');
                    $container.html(html);
                } else {
                    $container.html('<div class="no-favorited"><i class="fas fa-book-open"></i> No favorited works yet</div>');
                }
            } else {
                $container.html('<div class="error">Failed to load favorited works</div>');
            }
        })
        .catch(error => {
            $container.html('<div class="error">Error loading favorited works</div>');
            console.error('Error loading favorited works:', error);
        });
}

function deleteWork(workId, workName) {
    Swal.fire({
        title: 'Bạn chắc chắn muốn xóa?',
        text: "Bạn không thể hoàn tác lại thao tác này!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Vâng, xóa nó!',
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: '/Profile/DeleteWork',
                type: 'POST',
                data: {
                    workId: workId,
                    __RequestVerificationToken: $('input[name="__RequestVerificationToken"]').val()
                },
                success: function (response) {
                    if (response.success) {
                        Swal.fire(
                            'Đã xóa!',
                            `Tác phẩm "${response.workName || workName}" đã được xóa.`,
                            'success'
                        ).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Lỗi!',
                            response.message,
                            'error'
                        );
                    }
                },
                error: function () {
                    Swal.fire(
                        'Lỗi!',
                        'Không thể kết nối đến server',
                        'error'
                    );
                }
            });
        }
    });
}