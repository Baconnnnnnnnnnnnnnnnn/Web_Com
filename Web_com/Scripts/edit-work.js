document.addEventListener('DOMContentLoaded', function () {
    initTagSelection();
    // 2. Thiết lập sự kiện submit form chính
    setupFormSubmission();

    // 3. Thiết lập modal chỉnh sửa chapter
    setupChapterModals();

    // 4. Thiết lập cập nhật real-time cho Arc và Chapter
    setupRealTimeUpdates();
});

/* ========== TAG SELECTION ========== */
// Xử lý chọn tag
document.querySelectorAll('.tag-button').forEach(button => {
    button.addEventListener('click', function () {
        this.classList.toggle('selected');
        updateSelectedTags();
    });
});

function initTagSelection() {
    const tagButtons = document.querySelectorAll('.tag-button');
    const tagsContainer = document.getElementById('selectedTagsContainer');

    if (!tagsContainer) {
        console.error('Không tìm thấy selectedTagsContainer');
        return;
    }

    tagButtons.forEach(button => {
        button.addEventListener('click', function () {
            this.classList.toggle('selected');
            updateSelectedTags();
        });
    });

    validateTagSelection();
}

function updateSelectedTags() {
    const container = document.getElementById('selectedTagsContainer');
    if (!container) return;

    container.innerHTML = '';

    document.querySelectorAll('.tag-button.selected').forEach(button => {
        const tagId = button.getAttribute('data-tag-id');
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selectedTags[]';
        input.value = tagId;
        container.appendChild(input);
    });

    validateTagSelection();
}

function validateTagSelection() {
    const submitBtn = document.querySelector('#editWorkForm button[type="submit"]');
    if (!submitBtn) return;

    const selectedCount = document.querySelectorAll('.tag-button.selected').length;

    submitBtn.disabled = selectedCount === 0;
    if (selectedCount === 0) {
        submitBtn.title = 'Select at least 1 Tag';
    } else {
        submitBtn.title = '';
    }
}


// Xử lý submit form
document.getElementById('editWorkForm')?.addEventListener('submit', function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    // Hiển thị loading
    const swalInstance = Swal.fire({
        title: 'Loading...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    // Gửi dữ liệu bằng AJAX
    fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': document.querySelector('input[name="__RequestVerificationToken"]').value
        }
    })
        .then(response => response.json())
        .then(data => {
            swalInstance.close();

            if (data.success) {
                // Thành công
                Swal.fire({
                    icon: 'success',
                    title: 'Sucessfully!',
                    text: data.message,
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Chuyển hướng sau khi thêm thành công
                    window.location.href = data.redirectUrl;
                });
            } else {
                // Thất bại
                let errorMessage = data.message;
                if (data.errors && data.errors.length > 0) {
                    errorMessage += '<ul>' + data.errors.map(err => `<li>${err}</li>`).join('') + '</ul>';
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    html: errorMessage,
                    timer: 1500,
                    showConfirmButton: true
                });

                submitBtn.disabled = false;
            }
        })
        .catch(error => {
            swalInstance.close();
            Swal.fire({
                icon: 'error',
                title: 'System Error',
                text: 'Something went wrong',
                timer: 1500,
                showConfirmButton: false
            });
            submitBtn.disabled = false;
            console.error('Error:', error);
        });
});

function updateHiddenTagInputs(container, tags) {
    container.innerHTML = '';
    tags.forEach(tagId => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'selectedTags[]';
        input.value = tagId;
        container.appendChild(input);
    });
}

/* ========== FORM SUBMISSION ========== */
function setupFormSubmission() {
    const workForm = document.getElementById('editWorkForm');
    if (!workForm) return;

    workForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedTags = Array.from(this.querySelectorAll('input[name="selectedTags[]"]'))
            .map(input => parseInt(input.value));

        if (selectedTags.length === 0) {
            showAlert('error', 'At least one tag must be selected');
            return;
        }

        updateArcChapterData();
        submitFormData(this);
    });
}

function submitFormData(form) {
    const workFormData = new FormData(form);
    fetch(form.action, {
        method: 'POST',
        body: workFormData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', data.message, () => {
                    window.location.href = `/Profile/Index/${data.authorId}`;
                });
            } else {
                showAlert('error', data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('error', 'An error occurred while processing the request.');
        });
}

/* ========== CHAPTER MODALS ========== */
function setupChapterModals() {
    const modalElement = document.getElementById('chapterEditModal');
    const modalBody = document.getElementById('chapter-edit-body');
    if (!modalElement || !modalBody) return;

    document.addEventListener('click', function (e) {
        // === NÚT SAVE CHANGES TRONG MODAL ===
        if (e.target && (e.target.id === 'btnSaveChapterContent' ||
            e.target.closest('#btnSaveChapterContent'))) {
            e.preventDefault();

            const chapterContainer = modalBody.querySelector('#chapterEditForm');
            if (!chapterContainer) {
                console.error('[ERROR] Form not found in modal body');
                console.log('[DEBUG] Current modal body:', modalBody.innerHTML);
                Swal.fire({
                    title: 'Error!',
                    text: 'Unable to find form to save Chapter. Could be loading error',
                    icon: 'error'
                });
                return;
            }

            saveChapterChanges(chapterContainer, true);
            return;
        }

        // === NÚT EDIT CHAPTER ===
        if (e.target && e.target.classList.contains('edit-chapter-btn')) {
            const chapterId = e.target.dataset.chapterId;
            const isImage = e.target.dataset.isimage === 'True';

            fetch(`/ContentAdmin/EditChapterContent?chapterId=${chapterId}`)
                .then(res => {
                    if (!res.ok) throw new Error('Network response was not ok');
                    return res.text();
                })
                .then(html => {
                    modalBody.innerHTML = html;
                    const modal = new bootstrap.Modal(modalElement);
                    modal.show();

                    // Delay khởi tạo editor để tránh mất form do DOM chưa ổn định
                    setTimeout(() => {
                        const form = modalBody.querySelector('#chapterEditForm');
                        if (!form) {
                            console.warn('[WARNING] Form still not exist after open modal');
                            console.log('[DEBUG] Modal body:', modalBody.innerHTML);
                            return;
                        }

                        if (isImage) {
                            initMangaEditor();
                        } else {
                            initNovelEditor();
                        }
                    }, 100);
                })
                .catch(error => {
                    console.error('Error loading chapter content:', error);
                    showAlert('error', 'Unable to load Chapter Content');
                });
        }
    });
    const container = document.querySelector('#chapterEditForm');
    if (!container) {
        console.warn('Unable to find Chapter Content');
        return;
    }
    saveChapterChanges(container, true);
}

function initMangaEditor() {
    // Khởi tạo Sortable cho danh sách ảnh
    const imageList = document.getElementById('imagePreviewList');
    if (imageList) {
        new Sortable(imageList, {
            animation: 150,
            ghostClass: 'sortable-ghost',
            handle: 'img', // Chỉ kéo ảnh
        });
    }

    // Xử lý nút xóa ảnh
    document.querySelectorAll('.delete-image-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const imageId = this.dataset.imageId;

            Swal.fire({
                title: 'Confirm to Delete?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel'
            }).then((result) => {
                if (result.isConfirmed) {
                    deleteChapterImage(imageId);
                }
            });
        });
    });

    // Xử lý thay ảnh đơn lẻ
    document.querySelectorAll('.replaceable-image').forEach(img => {
        img.addEventListener('click', function () {
            const imageId = this.dataset.imageId;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';

            input.onchange = function (e) {
                const file = e.target.files[0];
                if (file) {
                    replaceChapterImage(imageId, file);
                }
            };

            input.click();
        });
    });

    // Xử lý chọn thêm ảnh mới (nhưng không lưu tự động)
    const uploadInput = document.getElementById('chapterImageUpload');
    if (uploadInput) {
        uploadInput.addEventListener('change', function () {
            const files = uploadInput.files;
            if (files.length === 0) return;

            const previewList = document.getElementById('imagePreviewList');
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                const newImgDiv = document.createElement('div');
                newImgDiv.className = 'col-md-4 mb-2 position-relative';

                const img = document.createElement('img');
                img.className = 'img-fluid border rounded';
                img.src = URL.createObjectURL(file);
                img.alt = 'New Manga Image';

                newImgDiv.appendChild(img);
                previewList.appendChild(newImgDiv);
            }

            // ✅ Không gọi saveChapterChanges() ở đây — chờ người dùng bấm "Save"
        });
    }

    const deleteSelectedBtn = document.getElementById('btnDeleteSelectedImages');
    if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', () => {
            const selectedIds = Array.from(document.querySelectorAll('.delete-checkbox:checked'))
                .map(cb => cb.dataset.imageId);

            if (selectedIds.length === 0) {
                Swal.fire('No image selected', 'Select atleast 1 image to Delete', 'info');
                return;
            }

            Swal.fire({
                title: `Delete ${selectedIds.length} image?`,
                text: 'This action cannot be redo!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete',
                cancelButtonText: 'Cancel'
            }).then(result => {
                if (result.isConfirmed) {
                    deleteMultipleImages(selectedIds);
                }
            });
        });
    }

    const deleteAllBtn = document.getElementById('btnDeleteAllImages');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            Swal.fire({
                title: 'Delete All Image?',
                text: 'All image in this Chapter will be deleted!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Delete All',
                cancelButtonText: 'Cancel'
            }).then(result => {
                if (result.isConfirmed) {
                    const chapterId = document.querySelector('#chapterEditForm').dataset.chapterId;
                    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

                    const formData = new FormData();
                    formData.append('chapterId', chapterId);
                    formData.append('__RequestVerificationToken', token);

                    fetch('/ContentAdmin/DeleteAllImages', {
                        method: 'POST',
                        body: formData
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.success) {
                                document.getElementById('imagePreviewList').innerHTML = '';
                                showToast('Successfully Delete All Image');
                            } else {
                                throw new Error(data.message);
                            }
                        })
                        .catch(err => Swal.fire('Error', err.message, 'error'));
                }
            });
        });
    }
}

function initNovelEditor() {
    if (typeof tinymce !== 'undefined') {
        // Xóa editor cũ nếu tồn tại
        if (tinymce.get('chapterContent')) {
            tinymce.get('chapterContent').destroy();
        }

        tinymce.init({
            selector: '#chapterContent',
            height: 500,
            menubar: false,
            plugins: 'autoresize lists link',
            toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist',
            skin: 'oxide-dark',
            content_css: 'dark',
            setup: function (editor) {
                editor.on('change', function () {
                    editor.save();
                });
            }
        });
    }
}

/* ========== CHAPTER IMAGE HANDLING ========== */
function deleteChapterImage(imageId) {
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    const formData = new FormData();
    formData.append('imageId', imageId);
    formData.append('__RequestVerificationToken', token);

    fetch('/ContentAdmin/DeleteChapterImage', {
        method: 'POST',
        body: formData
        // Không cần headers — FormData tự set đúng Content-Type
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector(`.delete-image-btn[data-image-id="${imageId}"]`)?.closest('.col-md-4')?.remove();
                showToast('Đã xóa ảnh thành công');
            } else {
                throw new Error(data.message || 'Cannot delete image');
            }
        })
        .catch(error => {
            showAlert('error', error.message);
        });
}

function replaceChapterImage(imageId, file) {
    const imageFormData = new FormData(); // <-- đúng tên
    imageFormData.append('imageId', imageId);
    imageFormData.append('newImage', file);

    const container = document.querySelector('#chapterEditForm');
    const chapterId = container?.dataset?.chapterId;

    if (!chapterId) {
        console.error('[ERROR] Cannot get chapterId to replace image');
        return;
    }

    imageFormData.append('chapterId', chapterId);

    imageFormData.append('__RequestVerificationToken', document.querySelector('input[name="__RequestVerificationToken"]').value);

    fetch('/ContentAdmin/ReplaceChapterImage', {
        method: 'POST',
        body: imageFormData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const imgElement = document.querySelector(`.replaceable-image[data-image-id="${imageId}"]`);
                if (imgElement) {
                    imgElement.src = URL.createObjectURL(file);
                    showToast('Successfully Replace Image');
                }
            } else {
                throw new Error(data.message || 'Cannot Replace Image');
            }
        })
        .catch(error => {
            showAlert('error', error.message);
        });
}

function deleteMultipleImages(imageIds) {
    const token = document.querySelector('input[name="__RequestVerificationToken"]').value;

    const formData = new FormData();
    formData.append('__RequestVerificationToken', token);
    imageIds.forEach(id => formData.append('imageIds', id)); // mảng imageIds[]

    fetch('/ContentAdmin/DeleteMultipleImages', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast('Successfully Delete Image');
                imageIds.forEach(id => {
                    document.querySelector(`.delete-image-btn[data-image-id="${id}"]`)?.closest('.col-md-4')?.remove();
                });
            } else {
                throw new Error(data.message);
            }
        })
        .catch(err => {
            console.error(err);
            showAlert('error', err.message);
        });
}


/* ========== SAVE CHAPTER CHANGES ========== */
function saveChapterChanges(container = null, showAlert = true) {
    container = container || document.getElementById('chapterEditForm');
    if (!container) {
        console.error('[ERROR] Unable to find Chapter container');
        return;
    }

    const chapterId = container.dataset.chapterId;
    if (!chapterId) {
        console.error('[ERROR] Container did not have dataset.chapterId');
        return;
    }

    const formData = new FormData();
    formData.append('__RequestVerificationToken',
        document.querySelector('input[name="__RequestVerificationToken"]').value);
    formData.append('chapterId', chapterId);

    // Light Novel
    const titleInput = container.querySelector('input[name="chapterTitle"]');
    if (titleInput) {
        formData.append('chapterTitle', titleInput.value);
    }

    const contentTextarea = container.querySelector('textarea[name="content"]');
    if (contentTextarea) {
        if (typeof tinymce !== 'undefined' && tinymce.get('chapterContent')) {
            tinymce.triggerSave();
        }
        formData.append('content', contentTextarea.value);
    }

    // Manga - append các ảnh mới vào FormData
    const uploadInput = container.querySelector('input[type="file"][multiple]');
    const newFiles = uploadInput?.files;
    if (newFiles && newFiles.length > 0) {
        for (let i = 0; i < newFiles.length; i++) {
            formData.append("images", newFiles[i]); // key cố định "images"
        }
    }

    const saveBtn = container.querySelector('#btnSaveChapterContent');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Đang lưu...';
    }

    const orderedImageIds = [];
    document.querySelectorAll('#imagePreviewList .replaceable-image').forEach(img => {
        const imageId = img.dataset.imageId;
        if (imageId) {
            orderedImageIds.push(imageId);
        }
    });

    for (let id of orderedImageIds) {
        formData.append('orderedImageIds', id); // server sẽ nhận mảng orderedImageIds[]
    }

    fetch('/ContentAdmin/SaveChapterContent', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.message || 'Save Failed');

            Swal.fire('Saved', data.message, 'success')
                .then(() => {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('chapterEditModal'));
                    if (modal) modal.hide();
                    location.reload(); // để thấy ảnh mới và nội dung cập nhật
                });
        })
        .catch(error => {
            console.error(error);
            Swal.fire('Error', error.message, 'error');
        })
        .finally(() => {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
            }
        });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast position-fixed bottom-0 end-0 m-4 bg-success text-white px-3 py-2 rounded';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function showAlert(type, message, callback = null) {
    showToast(`${type === 'error' ? '❌' : '✅'} ${message}`);
    if (callback) callback();
}

function updateArcChapterData() {
    const container = document.getElementById('arcChapterDataContainer');
    if (!container) return;

    container.innerHTML = '';

    document.querySelectorAll('.arc-name-input').forEach(arcInput => {
        const arcId = arcInput.dataset.arcId;
        const arcTitle = arcInput.value;

        addHiddenInput(container, 'arcIds[]', arcId);
        addHiddenInput(container, 'arcTitles[]', arcTitle);

        document.querySelectorAll(`.chapter-name-input[data-arc-id="${arcId}"]`).forEach(chapInput => {
            const chapId = chapInput.dataset.chapId;
            const chapTitle = chapInput.value;

            addHiddenInput(container, 'chapterIds[]', chapId);
            addHiddenInput(container, 'chapterTitles[]', chapTitle);
        });
    });
}

function addHiddenInput(container, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    container.appendChild(input);
}

function setupRealTimeUpdates() {
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('arc-name-input') ||
            e.target.classList.contains('chapter-name-input')) {
            updateArcChapterData();
        }
    });
}