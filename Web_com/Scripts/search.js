document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput');
    let selectedGenreIds = [];
    let selectedTagIds = [];
    let selectedStatusIds = [];;
    let searchTimeout;
    loadRecommendWorks();

    // Hàm render works
    function renderWorks(works) {
        const worksList = document.getElementById('main-list');

        // Kiểm tra nếu dữ liệu không hợp lệ
        if (!Array.isArray(works)) {
            worksList.innerHTML = '<p class="error">Invalid data format from server</p>';
            console.error('renderWorks: Expected array, got:', works);
            return;
        }

        // Xoá danh sách cũ
        worksList.innerHTML = '';

        if (works.length === 0) {
            worksList.innerHTML = '<p class="no-results">No works found matching your criteria</p>';
            return;
        }

        // Render từng truyện với animation
        works.forEach((work, index) => {
            const card = document.createElement('div');
            card.className = 'work-card';
            card.style.opacity = '0'; // Bắt đầu ẩn, sẽ fade in
            card.classList.add('card'); 

            card.innerHTML = `
            <a href="/Work/Arc?workId=${work.workId}">
                <img src="/Content/Images/${work.workImage}" alt="${work.workName}" />
                <h3>${work.workName}</h3>
                <div class="genre">${work.GenreName || 'Unknown'}</div>
                <div class="status">Status: ${work.StatusName || 'Unknown'}</div>
                ${work.Tags && work.Tags.length > 0 ? `<div class="tags"><em>${work.Tags.join(', ')}</em></div>` : ''}
                <div class="author">Author: ${work.AuthorName || 'Unknown'}</div>
            </a>
            `;

            worksList.appendChild(card);

            // Hiệu ứng fade-in theo thứ tự
            setTimeout(() => {
                card.style.opacity = '0.95';
            }, index * 100);
        });
    }

    // Live search
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch();
        }, 300);
    });

    // Gắn sự kiện click cho genre
    document.querySelectorAll('#genreFilter .tag-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const genreId = parseInt(this.getAttribute('data-genre'));

            // Toggle lựa chọn genre (cho phép chọn nhiều)
            if (selectedGenreIds.includes(genreId)) {
                selectedGenreIds = selectedGenreIds.filter(id => id !== genreId);
                this.classList.remove('selected');
            } else {
                selectedGenreIds.push(genreId);
                this.classList.add('selected');
            }

            updateGenreLabel();
            performSearch();
        });
    });

    // Gắn sự kiện click cho tag
    document.querySelectorAll('#tagFilter .tag-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const tagId = parseInt(this.getAttribute('data-tag'));
            console.log('Tag clicked:', tagId, this.textContent);

            // Toggle lựa chọn tag
            if (selectedTagIds.includes(tagId)) {
                selectedTagIds = selectedTagIds.filter(id => id !== tagId);
                this.classList.remove('selected');
            } else {
                selectedTagIds.push(tagId);
                this.classList.add('selected');
            }

            updateTagLabel();
            performSearch();
        });
    });

    // Gắn sự kiện click cho status
    document.querySelectorAll('#statusFilter .tag-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const statusId = parseInt(this.getAttribute('data-status'));

            // Toggle lựa chọn status (cho phép chọn nhiều)
            if (selectedStatusIds.includes(statusId)) {
                selectedStatusIds = selectedStatusIds.filter(id => id !== statusId);
                this.classList.remove('selected');
            } else {
                selectedStatusIds.push(statusId);
                this.classList.add('selected');
            }

            updateStatusLabel();
            performSearch();
        });
    });

    // Hàm thực hiện tìm kiếm
    function performSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const hasNoFilter =
            searchTerm === '' &&
            selectedGenreIds.length === 0 &&
            selectedTagIds.length === 0 &&
            selectedStatusIds.length === 0;

        const recommendSection = document.getElementById('recommend-section');
        const recommendList = document.getElementById('recommend-list');
        const mainList = document.getElementById('main-list');

        if (hasNoFilter) {
            // Không có filter → hiện recommend
            recommendSection?.style.removeProperty('display');
            loadRecommendWorks(); // 🔁 gọi lại
        } else {
            recommendSection?.style.setProperty('display', 'none', 'important');
            recommendList.innerHTML = '';
        }

        // Có filter: gọi API
        mainList.classList.add('loading');

        const params = new URLSearchParams();
        if (searchTerm) params.append('searchTerm', searchTerm);
        selectedGenreIds.forEach(id => params.append('genreIds', id));
        selectedTagIds.forEach(id => params.append('tagIds', id));
        selectedStatusIds.forEach(id => params.append('statusIds', id));
        params.append('_', Date.now());

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        fetch(`/Web_Com/SearchWorks?${params.toString()}`, {
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                mainList.classList.remove('loading');
                mainList.innerHTML = '';
                renderWorks(data);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                mainList.classList.remove('loading');

                // Kiểm tra lỗi có phải là do abort (timeout) không
                if (error.name === 'AbortError') {
                    mainList.innerHTML = '<p class="error">Search timeout. Please try again.</p>';
                } else {
                    console.error('Search error:', error);
                    mainList.innerHTML = '<p class="error">An error occurred while searching. Please try again.</p>';
                }
            });
    }

    // Hàm cập nhật nhãn genre
    function updateGenreLabel() {
        const genreLabel = document.getElementById('genreLabel');
        if (selectedGenreIds.length === 0) {
            genreLabel.innerHTML = `<i class="fas fa-book"></i> Genre <i class="fas fa-caret-down"></i>`;
        } else {
            genreLabel.innerHTML = `<i class="fas fa-book"></i> Genre (${selectedGenreIds.length}) <i class="fas fa-caret-down"></i>`;
        }
    }

    // Hàm cập nhật nhãn tag
    function updateTagLabel() {
        const tagLabel = document.getElementById('tagLabel');
        if (selectedTagIds.length === 0) {
            tagLabel.innerHTML = `<i class="fas fa-tags"></i> Tags <i class="fas fa-caret-down"></i>`;
        } else {
            tagLabel.innerHTML = `<i class="fas fa-tags"></i> Tags (${selectedTagIds.length}) <i class="fas fa-caret-down"></i>`;
        }
    }

    // Hàm cập nhật nhãn status
    function updateStatusLabel() {
        const statusLabel = document.getElementById('statusLabel');
        if (selectedStatusIds.length === 0) {
            statusLabel.innerHTML = `<i class="fas fa-info-circle"></i> Status <i class="fas fa-caret-down"></i>`;
        } else {
            statusLabel.innerHTML = `<i class="fas fa-info-circle"></i> Status (${selectedStatusIds.length}) <i class="fas fa-caret-down"></i>`;
        }
    }

    function loadRecommendWorks() {
        fetch('/Web_Com/GetRecommendWorks')
            .then(response => {
                if (!response.ok) throw new Error("Failed to load recommend works");
                return response.json();
            })
            .then(data => {
                const recommendList = document.getElementById('recommend-list');
                recommendList.innerHTML = '';

                if (data && data.length > 0) {
                    data.forEach((work, index) => {
                        const card = document.createElement('div');
                        card.className = 'work-card';
                        card.style.opacity = '0'; // Bắt đầu ẩn
                        card.classList.add('card'); 

                        card.innerHTML = `
                        <a href="/Work/Arc?workId=${work.workId}">
                            <img src="/Content/Images/${work.workImage}" alt="${work.workName}" />
                            <h3>${work.workName}</h3>
                            <div class="genre">${work.GenreName || 'Unknown'}</div>
                            <div class="status">Status: ${work.StatusName || 'Unknown'}</div>
                            ${work.Tags && work.Tags.length > 0 ? `<div class="tags"><em>${work.Tags.join(', ')}</em></div>` : ''}
                            <div class="author">Author: ${work.AuthorName || 'Unknown'}</div>
                        </a>
                        `;
                        recommendList.appendChild(card);

                        // Áp hiệu ứng dần dần
                        setTimeout(() => {
                            card.style.opacity = '0.95';
                        }, index * 100);
                    });
                } else {
                    recommendList.innerHTML = '<p class="no-results">No recommended works found.</p>';
                }
            })
            .catch(err => {
                console.error('Failed to load recommended works:', err);
                document.getElementById('recommend-list').innerHTML = '<p class="error">Could not load recommended works.</p>';
            });
    }
    performSearch();
});