document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const searchWorkNameInput = document.getElementById('searchWorkName');
    const searchAuthorInput = document.getElementById('searchAuthor');
    const workRows = document.querySelectorAll('.work-row');
    const imageOverlay = document.getElementById('imageOverlay');
    const popupImage = document.getElementById('popupImage');
    const zoomableImages = document.querySelectorAll('.zoomable-image');

    // Filter state
    let selectedStatus = "";
    let selectedGenre = "";
    let selectedTags = [];
    let deleteMode = false;

    // Main filter function
    function applyFilters() {
        const nameFilter = searchWorkNameInput.value.toLowerCase().trim();
        const authorFilter = searchAuthorInput.value.toLowerCase().trim();
        let hasResults = false;

        workRows.forEach(row => {
            const workName = row.querySelector('.work-name').textContent.toLowerCase();
            const authorName = row.querySelector('.author-name').textContent.toLowerCase();
            const status = row.querySelector('.status-cell').textContent.trim().toLowerCase();
            const genre = row.querySelector('.genre-name').textContent.trim().toLowerCase();
            const tags = Array.from(row.querySelectorAll('.tag-cell span')).map(t => t.textContent.toLowerCase());

            const statusMatch = !selectedStatus || status === selectedStatus.toLowerCase();
            const genreMatch = !selectedGenre || genre === selectedGenre.toLowerCase();
            const tagMatch = selectedTags.length === 0 || selectedTags.every(tag => tags.includes(tag.toLowerCase()));
            const nameMatch = workName.includes(nameFilter);
            const authorMatch = authorName.includes(authorFilter);

            const shouldShow = statusMatch && genreMatch && tagMatch && nameMatch && authorMatch;
            row.style.display = shouldShow ? '' : 'none';

            if (shouldShow) {
                hasResults = true;
            }
        });

        // Show "No work available" message if no results
        const noResultsRow = document.querySelector('#worksTable tbody tr.no-results');
        if (!hasResults) {
            if (!noResultsRow) {
                const tbody = document.querySelector('#worksTable tbody');
                const noResultsHtml = `
                    <tr class="no-results">
                        <td colspan="7" style="text-align: center; padding: 20px;">
                            No works available matching your criteria
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', noResultsHtml);
            }
        } else {
            if (noResultsRow) {
                noResultsRow.remove();
            }
        }
    }

    // Event listeners for search inputs
    searchWorkNameInput.addEventListener('input', applyFilters);
    searchAuthorInput.addEventListener('input', applyFilters);

    // Status filter handling
    document.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedStatus = this.dataset.status;
            applyFilters();
        });
    });

    // Genre filter handling
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedGenre = this.dataset.genre;
            applyFilters();
        });
    });

    // Tag filter handling
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tag = this.dataset.tag.toLowerCase();

            if (tag === "") {
                // All tags selected
                selectedTags = [];
                document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            } else {
                // Toggle individual tag
                this.classList.toggle('active');
                document.querySelector('.tag-btn[data-tag=""]').classList.remove('active');

                if (this.classList.contains('active')) {
                    selectedTags.push(this.dataset.tag); // Store original case
                } else {
                    selectedTags = selectedTags.filter(t => t.toLowerCase() !== tag);
                }

                if (selectedTags.length === 0) {
                    document.querySelector('.tag-btn[data-tag=""]').classList.add('active');
                }
            }
            applyFilters();
        });
    });

    // Image zoom functionality
    zoomableImages.forEach(image => {
        image.addEventListener('click', function () {
            popupImage.src = this.src;
            imageOverlay.style.display = 'flex';
        });
    });

    imageOverlay.addEventListener('click', function (e) {
        if (e.target === imageOverlay) {
            imageOverlay.style.display = 'none';
        }
    });

    // Delete work functionality
    $(document).on('click', '.btn-delete', function (e) {
        e.preventDefault();
        const workId = $(this).data('work-id');
        const workName = $(this).closest('tr').find('.work-name').text();
        const token = $('input[name="__RequestVerificationToken"]').val();

        showPasswordConfirmation(
            `Delete Work: "${workName}"?`,
            'This will permanently delete the work and all its arcs and chapters!',
            '/ContentAdmin/DeleteWork',
            { workId: workId, __RequestVerificationToken: token },
            '#ff99cc'
        );
    });

    // Add new tag functionality
    $('#addTagBtn').click(function () {
        Swal.fire({
            title: 'Add New Tag',
            input: 'text',
            inputPlaceholder: 'Enter tag name...',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Add',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => !value && 'Tag name cannot be empty!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: '/ContentAdmin/AddTag',
                    type: 'POST',
                    data: { tagName: result.value },
                    success: handleTagAddResponse,
                    error: () => showErrorAlert('An error occurred while adding the tag', '#28a745')
                });
            }
        });
    });

    // Delete tag functionality
    $('#deleteTagBtn').click(function () {
        if (!deleteMode) {
            enterDeleteMode();
        } else {
            cancelDeleteMode();
        }
    });

    $(document).on('click', '.tag-buttons.delete-mode .tag-btn:not([data-tag=""])', function () {
        const tagName = $(this).data('tag');
        const tagId = $(this).data('tag-id');
        showPasswordConfirmation(
            `Delete Tag: "${tagName}"?`,
            'This will remove the tag from all works!',
            '/ContentAdmin/DeleteTag',
            { tagId: tagId, password: '123' },
            '#dc3545',
            cancelDeleteMode
        );
    });

    // Helper functions
    function enterDeleteMode() {
        deleteMode = true;
        $('#deleteTagBtn').text('Cancel Delete').css('background-color', '#6c757d');
        $('#deleteTagLabel').show();
        $('.tag-btn[data-tag=""]').addClass('disabled');
        $('.tag-buttons').addClass('delete-mode');
    }

    function cancelDeleteMode() {
        deleteMode = false;
        $('#deleteTagBtn').text('Delete Tag').css('background-color', '#dc3545');
        $('#deleteTagLabel').hide();
        $('.tag-btn[data-tag=""]').removeClass('disabled');
        $('.tag-buttons').removeClass('delete-mode');
        $('.tag-btn').removeClass('selected-to-delete');
    }

    function handleTagAddResponse(response) {
        if (response.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: response.message,
                confirmButtonColor: '#28a745'
            }).then(() => {
                location.reload(); // Refresh to ensure proper initialization
            });
        } else {
            showErrorAlert(response.message, '#28a745');
        }
    }

    function showPasswordConfirmation(title, html, url, data, confirmColor, onCancel) {
        Swal.fire({
            title: title,
            html: `${html}<br><br>
              <b style="color: #ff0000;">Enter your admin password to confirm:</b>
              <input type="password" id="deletePassword" class="swal2-input" placeholder="Password">`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: confirmColor,
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            focusConfirm: false,
            preConfirm: () => {
                const password = document.getElementById('deletePassword').value;
                if (!password) {
                    Swal.showValidationMessage('Password is required');
                } else if (password !== "123") {
                    Swal.showValidationMessage('Incorrect password');
                }
                return password;
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // Thêm password vào data trước khi gửi
                data.password = result.value; // Sử dụng password người dùng nhập

                $.ajax({
                    url: url,
                    type: 'POST',
                    data: data,
                    success: (response) => {
                        if (response.success) {
                            Swal.fire({
                                icon: 'success',
                                title: 'Deleted!',
                                text: response.message,
                                confirmButtonColor: confirmColor
                            }).then(() => location.reload());
                        } else {
                            showErrorAlert(response.message, confirmColor);
                            if (onCancel) onCancel();
                        }
                    },
                    error: () => {
                        showErrorAlert('An error occurred while processing your request', confirmColor);
                        if (onCancel) onCancel();
                    }
                });
            } else if (onCancel) {
                onCancel();
            }
        });
    }

    function showErrorAlert(message, confirmColor) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            confirmButtonColor: confirmColor
        });
    }

    $(document).on('click', '.btn-disable, .btn-enable', function (e) {
        e.preventDefault();
        const $btn = $(this);
        const workId = $btn.data('work-id');
        const workName = $btn.data('work-name');
        const isEnabling = $btn.hasClass('btn-enable');
        const token = $('input[name="__RequestVerificationToken"]').val();

        Swal.fire({
            title: `${isEnabling ? 'Enable' : 'Disable'} Work: "${workName}"?`,
            text: isEnabling ? 'This will make the work visible to readers again' : 'This will hide the work from readers',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff99cc',
            cancelButtonColor: '#d33',
            confirmButtonText: `Yes, ${isEnabling ? 'enable' : 'disable'} it!`,
            scrollbarPadding: false
        }).then((result) => {
            if (result.isConfirmed) {
                const action = isEnabling ? 'EnableWork' : 'DisableWork';
                $.ajax({
                    url: `/ContentAdmin/${action}`,
                    type: 'POST',
                    data: {
                        workId: workId,
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
                                text: response.message || `Work ${isEnabling ? 'enabled' : 'disabled'} successfully`,
                                confirmButtonColor: '#ff99cc',
                                timer: 3000,
                                timerProgressBar: true,
                                scrollbarPadding: false
                            }).then(() => {
                                // Update button appearance
                                $btn.toggleClass('btn-enable btn-disable');
                                $btn.text(isEnabling ? 'Disable' : 'Enable');

                                // Update the row styling if needed
                                const $row = $btn.closest('tr');
                                $row.toggleClass('disabled-work', !isEnabling);
                            });
                        } else {
                            showError(response?.message || 'Unknown error occurred');
                        }
                    },
                    error: function (xhr) {
                        const errorMsg = xhr.responseJSON?.message || `Error ${isEnabling ? 'enabling' : 'disabling'} work`;
                        showError(errorMsg);
                    }
                });
            }
        });
    });

    // Helper function to show error messages
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