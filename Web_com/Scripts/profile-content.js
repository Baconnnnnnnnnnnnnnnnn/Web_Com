// Khai báo biến toàn cục
let currentWorkId = null;
let currentGenre = null;
let currentArcId = null;
let existingArcNames = [];
let existingChapterNames = [];

// Khởi tạo trang khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', function () {
    // Lấy dữ liệu từ server
    if (window.workData) {
        currentWorkId = window.workData.workId || null;
        currentGenre = window.workData.genre || null;
        existingArcNames = window.workData.existingArcs || [];
        existingChapterNames = window.workData.existingChapters || [];
    }

    console.log('Initialized with:', {
        currentWorkId,
        currentGenre,
        existingArcNames,
        existingChapterNames
    });

    // Khởi tạo các sự kiện
    initArcManagement();
    initChapterManagement();

    // Nếu đã có Arc thì hiển thị section Chapter
    if (existingArcNames.length > 0) {
        document.getElementById('chapterSection').style.display = 'block';
    }

    // Khởi tạo TinyMCE nếu là light novel
    if (currentGenre !== 'Manga') {
        initTinyMCE();
    }
});

// ================== ARC MANAGEMENT ================== //

function initArcManagement() {
    const btnAddArc = document.getElementById('btnAddArc');
    const btnSubmitArc = document.getElementById('btnSubmitArc');

    if (!btnAddArc || !btnSubmitArc) {
        console.error('Missing arc management elements');
        return;
    }

    // Toggle hiển thị form thêm Arc
    btnAddArc.addEventListener('click', function () {
        const form = document.getElementById('arcCreationForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';

        // Tự động tính order tiếp theo
        const nextOrder = existingArcNames.length + 1;
        document.getElementById('arcOrderInput').value = nextOrder;

        // Focus vào ô nhập tên
        document.getElementById('arcNameInput').focus();
    });

    // Xử lý submit Arc
    btnSubmitArc.addEventListener('click', createNewArc);
}

function createNewArc() {
    const arcNameInput = document.getElementById('arcNameInput');
    const arcName = arcNameInput.value.trim();
    const arcOrder = document.getElementById('arcOrderInput').value;

    // Validate
    if (!arcName) {
        showError('Please enter arc name');
        arcNameInput.focus();
        return;
    }

    // Kiểm tra trùng tên
    if (existingArcNames.includes(arcName)) {
        showError('Arc name already exists in this work');
        return;
    }

    showLoading('Creating Arc...');

    // Gửi request tạo Arc mới
    fetch('/Profile/AddArc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'RequestVerificationToken': getAntiForgeryToken()
        },
        body: JSON.stringify({
            workId: currentWorkId,
            title: arcName, // Đã sửa lỗi cú pháp
            order: arcOrder
        })
    })
        .then(handleResponse)
        .then(data => {
            if (data.success) {
                // Cập nhật danh sách tên Arc
                existingArcNames.push(arcName);

                // Hiển thị Arc mới
                displayNewArc(data.arcId, arcName, data.order);
                console.log("New arc added:", data);

                // Reset form
                document.getElementById('arcCreationForm').style.display = 'none';
                arcNameInput.value = '';

                // Hiển thị section Chapter
                document.getElementById('chapterSection').style.display = 'block';
                document.getElementById('currentArcName').textContent = arcName;
                currentArcId = data.arcId;
                console.log("Current arc id:", currentArcId);

                // Reset danh sách Chapter khi chuyển sang Arc mới
                existingChapterNames = [];
                document.getElementById('chapterList').innerHTML = '';

                showSuccess('Arc created successfully!');
            } else {
                throw new Error(data.message || 'Failed to create arc');
            }
        })
        .catch(handleError);
}

function displayNewArc(arcId, name, order) {
    const arcList = document.getElementById('arcList');
    if (!arcList) return;

    const arcItem = document.createElement('div');
    arcItem.className = 'item-card';
    arcItem.innerHTML = `
    < h4 >
            <span>${name}</span>
            <small>Order: ${order}</small>
        </h4 >
    <div class="item-meta">Arc ID: ${arcId}</div>
`;
    arcList.appendChild(arcItem);
}

// ================== CHAPTER MANAGEMENT ================== //

function initChapterManagement() {
    const btnAddChapter = document.getElementById('btnAddChapter');
    const btnSubmitChapter = document.getElementById('btnSubmitChapter');

    if (!btnAddChapter || !btnSubmitChapter) {
        console.error('Missing chapter management elements');
        return;
    }

    // Toggle hiển thị form thêm Chapter
    btnAddChapter.addEventListener('click', function () {
        const form = document.getElementById('chapterCreationForm');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';

        // Tự động tính order tiếp theo
        const nextOrder = existingChapterNames.length + 1;
        document.getElementById('chapterOrderInput').value = nextOrder;

        // Focus vào ô nhập tên
        document.getElementById('chapterNameInput').focus();

        // Re-khởi tạo TinyMCE nếu là light novel
        if (currentGenre !== 'Manga') {
            initTinyMCE();
        }
    });

    // Xử lý submit Chapter
    btnSubmitChapter.addEventListener('click', createNewChapter);

    // Xử lý preview ảnh cho Manga
    if (currentGenre === 'Manga') {
        document.getElementById('chapterImages').addEventListener('change', handleImagePreview);
    }
}

function createNewChapter() {
    const chapterNameInput = document.getElementById('chapterNameInput');
    const chapterName = chapterNameInput.value.trim();
    const chapterOrder = document.getElementById('chapterOrderInput').value;

    // Validate tên chapter
    if (!chapterName) {
        showError('Please enter chapter name');
        chapterNameInput.focus();
        return;
    }

    // Kiểm tra trùng tên
    if (existingChapterNames.includes(chapterName)) {
        showError('Chapter name already exists in this arc');
        return;
    }

    showLoading('Creating Chapter...');

    // Chuẩn bị dữ liệu gửi đi
    const formData = new FormData();
    formData.append('arcId', currentArcId);
    formData.append('title', chapterName);
    formData.append('order', chapterOrder);
    formData.append('isImage', currentGenre === 'Manga');

    if (currentGenre === 'Manga') {
        const files = document.getElementById('chapterImages').files;
        if (files.length === 0) {
            showError('Please upload at least one image for manga chapter');
            return;
        }
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }
    } else {
        // Lưu nội dung từ TinyMCE
        if (typeof tinymce !== 'undefined' && tinymce.get('chapterContentInput')) {
            tinymce.triggerSave();
        }
        let content = document.getElementById('chapterContentInput').value.trim();
        if (!content) {
            showError('Please enter chapter content');
            return;
        }
        // Sanitize nội dung để loại bỏ thẻ nguy hiểm
        content = sanitizeContent(content);
        console.log('Sanitized content:', content);
        formData.append('content', content);
    }

    // Gửi request đến controller
    fetch('/Profile/AddChapter', {
        method: 'POST',
        body: formData,
        headers: {
            'RequestVerificationToken': getAntiForgeryToken()
        }
    })
        .then(handleResponse)
        .then(data => {
            console.log('Chapter response:', data);
            if (data.success) {
                // Cập nhật UI
                existingChapterNames.push(chapterName);
                displayNewChapter(data.chapterId, chapterName, data.order);

                // Reset form
                document.getElementById('chapterCreationForm').style.display = 'none';
                chapterNameInput.value = '';
                document.getElementById('chapterOrderInput').value = parseInt(chapterOrder) + 1;

                if (currentGenre === 'Manga') {
                    document.getElementById('chapterImages').value = '';
                    document.getElementById('imagePreview').innerHTML = '';
                } else {
                    // Reset TinyMCE
                    if (typeof tinymce !== 'undefined' && tinymce.get('chapterContentInput')) {
                        tinymce.get('chapterContentInput').setContent('');
                    }
                    document.getElementById('chapterContentInput').value = '';
                }

                showSuccess('Chapter created successfully!');
            } else {
                throw new Error(data.message || 'Failed to create chapter');
            }
        })
        .catch(handleError);
}

function displayNewChapter(chapterId, name, order) {
    const chapterList = document.getElementById('chapterList');
    if (!chapterList) return;

    const chapterItem = document.createElement('div');
    chapterItem.className = 'item-card';
    chapterItem.innerHTML = `
    < h4 >
            <span>${name}</span>
            <small>Order: ${order}</small>
        </h4 >
    <div class="item-meta">Chapter ID: ${chapterId}</div>
`;
    chapterList.appendChild(chapterItem);
}

function handleImagePreview(event) {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;

    previewContainer.innerHTML = '';

    Array.from(event.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';
            previewItem.innerHTML = `
    < img src = "${e.target.result}" alt = "Preview" >
        <p>${file.name}</p>
`;
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

// ================== TINYMCE INITIALIZATION ================== //

function initTinyMCE() {
    if (typeof tinymce === 'undefined') {
        console.error('TinyMCE not loaded');
        return;
    }
    if (!document.getElementById('chapterContentInput')) {
        console.error('Textarea #chapterContentInput not found');
        return;
    }
    console.log('Initializing TinyMCE');

    // Xóa editor cũ nếu tồn tại
    if (tinymce.get('chapterContentInput')) {
        tinymce.get('chapterContentInput').destroy();
    }

    tinymce.init({
        selector: '#chapterContentInput',
        height: 500,
        menubar: false,
        plugins: 'autoresize lists link',
        toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist',
        skin: 'oxide-dark',
        content_css: 'dark',
        valid_elements: 'p,br,b,i,ul,ol,li,a[href],strong,em,div,span', // Chỉ cho phép thẻ an toàn
        setup: function (editor) {
            editor.on('change', function () {
                editor.save();
            });
        }
    });
}

// ================== UTILITY FUNCTIONS ================== //

function sanitizeContent(content) {
    // Loại bỏ thẻ <script> và các thuộc tính nguy hiểm như on*
    const div = document.createElement('div');
    div.innerHTML = content;
    const scripts = div.getElementsByTagName('script');
    while (scripts.length > 0) {
        scripts[0].parentNode.removeChild(scripts[0]);
    }
    // Loại bỏ thuộc tính on* (như onclick, onerror)
    const elements = div.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        const attrs = elements[i].attributes;
        for (let j = attrs.length - 1; j >= 0; j--) {
            if (attrs[j].name.startsWith('on')) {
                elements[i].removeAttribute(attrs[j].name);
            }
        }
    }
    return div.innerHTML;
}

function getAntiForgeryToken() {
    const token = document.querySelector('input[name="__RequestVerificationToken"]');
    if (!token) {
        console.error('AntiForgeryToken not found!');
        throw new Error('Security token missing');
    }
    return token.value;
}

function handleResponse(response) {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${ response.status } `);
    }
    return response.json();
}

function handleError(error) {
    console.error('Error:', error);
    Swal.fire('Error', error.message || 'An error occurred', 'error');
}

function showLoading(message) {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
}

function showSuccess(message) {
    Swal.fire('Success', message, 'success');
}

function showError(message) {
    Swal.fire('Error', message, 'error');
}
