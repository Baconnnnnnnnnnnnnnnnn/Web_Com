document.addEventListener('DOMContentLoaded', function () {
    initProfilePage();
});

/**
 * HTML escape function to prevent XSS when inserting user data
 * @param {string} unsafe 
 */
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

let currentSwalInstance = null;

/**
 * Initialize events for the Profile page
 */
function initProfilePage() {
    // Get userId from the URL
    const pathParts = window.location.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];

    // Fix recursion issue when clicking the cover image
    $('#coverImageContainer').off('click').on('click', function (e) {
        // Only trigger when clicking the container, not the file input itself
        if (e.target === this) {
            $('#coverImageUpload').trigger('click');
        }
    });

    $('#coverImageUpload').off('change').on('change', function (e) {
        if (e.target.files && e.target.files[0]) {
            uploadImage(e.target.files[0], 'cover');
        }
    });

    // Fix recursion issue when clicking the avatar
    $('#avatarContainer').off('click').on('click', function (e) {
        // Only trigger when clicking the container, not the file input itself
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

    // Handle Follow button
    $('.follow-btn').off('click').on('click', function () {
        // Lấy ID trực tiếp từ nút bấm thay vì parse URL
        const authorId = $(this).data('author-id');
        // Truyền nút bấm (this) vào hàm để dễ update UI
        followAuthor(authorId, $(this));
    });

    // Handle work card clicks - using event delegation
    $(document).off('click', '.work-card').on('click', '.work-card', function (e) {
        // Prevent event if clicking the Edit or Delete buttons
        if ($(e.target).closest('.work-edit-btn, .work-delete-btn').length) {
            e.stopPropagation(); // Stop event bubbling to the parent card
            return;
        }

        const workId = $(this).data('work-id');
        if (workId) {
            window.location.href = '/Work/Arc?workId=' + workId;
        }
    });

    // Handle tab clicks - using event delegation
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
 * Upload image to server
 * @param {File} file - Image file to upload
 * @param {string} type - Image type ('cover' or 'avatar')
 */
function uploadImage(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    // Show loading state
    const swalInstance = Swal.fire({
        title: 'Uploading...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    // Call upload API
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
                // Update image without causing recursion
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
 * Display password verification modal before editing
 */
function showUserDetails() {
    Swal.fire({
        title: 'Verify to Edit',
        html: `
            <div class="form-group">
                <label>Enter current password</label>
                <div class="password-input-container">
                    <input type="password" id="verifyPassword" class="swal2-input" placeholder="Password">
                    <i class="fas fa-eye-slash toggle-password" id="toggleVerifyPassword"></i>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Continue',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            // Add toggle event for the verification modal
            const verifyToggle = document.querySelector('#toggleVerifyPassword');
            const verifyInput = document.querySelector('#verifyPassword');
            if (verifyToggle && verifyInput) {
                verifyToggle.addEventListener('click', () => {
                    togglePasswordVisibility(verifyInput, verifyToggle);
                });
            }
        },
        preConfirm: () => {
            const pwd = $('#verifyPassword').val();
            if (!pwd) {
                Swal.showValidationMessage('Please enter your password');
                return false;
            }
            return pwd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const enteredPassword = result.value;

            $.ajax({
                url: '/Profile/VerifyPasswordForEdit',
                type: 'POST',
                data: { Password: enteredPassword },
                success: function (response) {
                    if (response.success) {
                        // Open edit modal with actual data
                        const user = response.data;
                        openEditProfileModal(user);
                    } else {
                        Swal.fire('Error', response.message || 'Incorrect password', 'error');
                    }
                },
                error: function () {
                    Swal.fire('Error', 'Could not connect to server', 'error');
                }
            });
        }
    });
}

/**
 * Open profile edit modal with 3 fields: name, email, and password (shown as plain text)
 * @param {Object} user 
 */
function openEditProfileModal(user) {
    Swal.fire({
        title: 'Edit Information',
        html: `
            <div class="profile-edit-form">
                <div class="form-group">
                    <label>Display Name</label>
                    <input type="text" id="editName" class="swal2-input" value="${escapeHtml(user.usersName || '')}">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="editEmail" class="swal2-input" value="${escapeHtml(user.usersEmail || '')}">
                </div>
                <div class="form-group password-group">
                    <label>Current / New Password</label>
                    <div class="password-input-container">
                        <input type="text" id="editPassword" class="swal2-input" value="${escapeHtml(user.usersPass || '')}">
                        <i class="fas fa-eye toggle-password" id="toggleEditPassword"></i> 
                    </div>
                    <small style="color: #666; display: block; margin-top: 5px;">
                        This is your current password. You can keep it as is or change it to a new one.
                    </small>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Save Changes',
        cancelButtonText: 'Cancel',
        didOpen: () => {
            // Add toggle event for the edit modal
            const editToggle = document.querySelector('#toggleEditPassword');
            const editInput = document.querySelector('#editPassword');
            if (editToggle && editInput) {
                editToggle.addEventListener('click', () => {
                    togglePasswordVisibility(editInput, editToggle);
                });
            }
        },
        preConfirm: () => {
            const name = $('#editName').val().trim();
            const email = $('#editEmail').val().trim();
            const password = $('#editPassword').val().trim();

            if (!name || !email) {
                Swal.showValidationMessage('Name and Email cannot be empty');
                return false;
            }

            // If user clears the password -> show warning
            if (password === '') {
                Swal.showValidationMessage('If you do not want to change your password, please keep the current value');
                return false;
            }

            return { name, email, password };
        }
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            updateUserDetails(result.value);
        }
    });
}

/**
 * Toggle password visibility (reusable for both modals)
 * @param {HTMLElement} inputElement - Password input element
 * @param {HTMLElement} iconElement - Toggle icon element
 */
function togglePasswordVisibility(inputElement, iconElement) {
    if (inputElement.type === 'password') {
        inputElement.type = 'text';
        iconElement.classList.remove('fa-eye-slash');
        iconElement.classList.add('fa-eye');
    } else {
        inputElement.type = 'password';
        iconElement.classList.remove('fa-eye');
        iconElement.classList.add('fa-eye-slash');
    }
}

/**
 * Update user details on the server
 * @param {Object} data - Form data {name, email, password}
 */
function updateUserDetails(data) {
    $.ajax({
        url: '/Profile/UpdateUserDetails',
        type: 'POST',
        data: {
            Name: data.name,
            Email: data.email,
            Password: data.password
        },
        success: function (response) {
            if (response.success) {
                Swal.fire('Success', response.message, 'success').then(() => {
                    location.reload();
                });
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        },
        error: function () {
            Swal.fire('Error', 'Failed to update details', 'error');
        }
    });
}

/**
 * Follow / Unfollow an author
 * @param {number} authorId - Author's ID
 */
function followAuthor(authorId, $btn) {
    if (!$btn) $btn = $('.follow-btn');

    $.ajax({
        url: '/Profile/FollowAuthor',
        type: 'POST',
        data: { authorId: authorId },
        success: function (response) {
            if (response.success) {
                // 1. Update Button UI (Icon & Text)
                $btn.toggleClass('following', response.isFollowing);
                const iconClass = response.isFollowing ? 'fas' : 'far';
                const text = response.isFollowing ? 'Following' : 'Follow';
                $btn.html(`<i class="${iconClass} fa-heart"></i> ${text}`);

                // 2. Update Follower Count smoothly (No page reload needed)
                if (response.newFollowerCount !== undefined) {
                    $('#followerCountDisplay').text(response.newFollowerCount);
                }
            } else {
                Swal.fire('Error', response.message, 'error');
            }
        },
        error: function () {
            Swal.fire('Error', 'Could not process your request', 'error');
        }
    });
}

/**
 * Load followers list
 * @param {number} userId - User ID
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

/**
 * Load following list
 * @param {number} userId - User ID
 */
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
                $container.html('<div class="error">Failed to load following list</div>');
            }
        })
        .catch(error => {
            $container.html('<div class="error">Error loading following list</div>');
            console.error('Error loading following:', error);
        });
}

/**
 * Load favorited works list
 * @param {number} userId - User ID
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

/**
 * Delete a work
 * @param {number} workId 
 * @param {string} workName 
 */
function deleteWork(workId, workName) {
    Swal.fire({
        title: 'Are you sure you want to delete?',
        text: "You won't be able to revert this action!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
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
                            'Deleted!',
                            `The work "${response.workName || workName}" has been deleted.`,
                            'success'
                        ).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Error!',
                            response.message,
                            'error'
                        );
                    }
                },
                error: function () {
                    Swal.fire(
                        'Error!',
                        'Could not connect to the server',
                        'error'
                    );
                }
            });
        }
    });
}