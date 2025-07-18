// GUEST ONLY: Login Popup
function createLoginOverlay(message) {
    const overlay = document.createElement('div');
    overlay.className = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-popup">
            <p>${message}</p>
            <div class="login-buttons">
                <button onclick="window.location.href='/Home/Web_Com'">Yes</button>
                <button onclick="closeLoginPopup()">No</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function handleGuestCommentSubmit(event) {
    event.preventDefault();
    createLoginOverlay("Please login to leave a comment");
}

function handleGuestFavorite(event) {
    event.preventDefault();
    createLoginOverlay("Please login to use the Favorite feature");
}

function handleGuestHeart(event) {
    event.preventDefault();
    createLoginOverlay("Please login to like this work");
}

function handleGuestComment(event) {
    event.preventDefault();
    createLoginOverlay("Please login to comment this work");
}

function handleGuestHeartComment(event) {
    event.preventDefault();
    createLoginOverlay("Please login to like comment this work");
}

function closeLoginPopup() {
    const popup = document.querySelector('.login-overlay');
    if (popup) popup.remove();
}

// Zoom ảnh
function zoomImage(src) {
    const popup = document.getElementById("imageOverlay");
    const img = document.getElementById("popupImage");
    if (img && popup) {
        img.src = src;
        popup.style.display = "flex";
    }
}

function closeImagePopup() {
    const popup = document.getElementById("imageOverlay");
    if (popup) popup.style.display = "none";
}

// Toggle chương theo Arc
function toggleChapters(arcId) {
    const row = document.getElementById(`chapters-${arcId}`);
    if (row) {
        row.style.display = row.style.display === "none" ? "table-row" : "none";
    }
}

// Biến lưu chapter hiện tại
let currentChapterImages = [];
let currentImageIndex = 0;
let isLoading = false;
window.currentChapterId = null;

// Hiển thị nội dung chương (Light Novel hoặc Manga)
function showChapterContent(chapterId) {
    const row = document.querySelector(`.chapter-row[onclick*="${chapterId}"]`);
    const isImage = row.getAttribute('data-isimage') === "True" || row.getAttribute('data-isimage') === "true";
    const title = row.getAttribute('data-title');
    const displayBox = document.getElementById('chapter-content-box');
    if (!row || !displayBox) return;

    window.currentChapterId = chapterId;

    let contentHtml = "";

    if (isImage) {
        contentHtml = `
            <h3>${title}</h3>
            <div class="manga-viewer">
                <button class="nav-button prev-button" disabled>&lt;</button>
                <div class="image-container loading"></div>
                <button class="nav-button next-button" disabled>&gt;</button>
            </div>
        `;
    } else {
        const content = row.getAttribute('data-content')?.replaceAll("&#10;", "\n") ?? "";
        contentHtml = `<h3>${title}</h3><div class="novel-content">${content}</div>`;
    }

    displayBox.innerHTML = contentHtml;

    // ======= Tạo navigation buttons =======
    const navWrapper = document.createElement("div");
    navWrapper.style.display = "flex";
    navWrapper.style.justifyContent = "center";
    navWrapper.style.gap = "20px";
    navWrapper.style.marginTop = "30px";

    const prevBtn = document.createElement("button");
    prevBtn.id = "prevChapterBtn";
    prevBtn.className = "button-favorite";
    prevBtn.innerText = "← Previous Chapter";
    prevBtn.onclick = prevChapter;

    const nextBtn = document.createElement("button");
    nextBtn.id = "nextChapterBtn";
    nextBtn.className = "button-favorite";
    nextBtn.innerText = "Next Chapter →";
    nextBtn.onclick = nextChapter;

    navWrapper.appendChild(prevBtn);
    navWrapper.appendChild(nextBtn);
    displayBox.appendChild(navWrapper);

    // ======= Kiểm tra chương đầu/cuối =======
    const allChapters = Array.from(document.querySelectorAll(".chapter-row"));
    const currentIndex = allChapters.findIndex(r => r.getAttribute("data-chapterid") === chapterId);
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === allChapters.length - 1;

    if (isFirst) prevBtn.style.display = "none";
    if (isLast) {
        nextBtn.disabled = true;
        nextBtn.innerText = "You've reached to the end";
        nextBtn.classList.add("end-of-series");
    }

    // Nếu là Manga → fetch ảnh
    if (isImage) {
        fetch(`/Work/GetChapterImages?chapterId=${chapterId}`)
            .then(res => {
                if (!res.ok) throw new Error("HTTP Error " + res.status);
                return res.json();
            })
            .then(images => {
                if (!images || images.length === 0) {
                    displayBox.innerHTML += `<p style="color:yellow;">No images found.</p>`;
                    return;
                }
                currentChapterImages = images;
                currentImageIndex = 0;
                updateImageDisplay();
            })
            .catch(err => {
                console.error("Image fetch error:", err);
                displayBox.innerHTML += `<p style="color:red;">Error loading images.</p>`;
            });
    }
}

// Chương kế tiếp
function nextChapter() {
    const allChapters = document.querySelectorAll(".chapter-row");
    const currentId = window.currentChapterId;
    let found = false;
    let nextRow = null;

    allChapters.forEach((row, index) => {
        const chapId = row.getAttribute("data-chapterid");
        if (chapId === currentId && !found) {
            found = true;
            if (index + 1 < allChapters.length) {
                nextRow = allChapters[index + 1];
            }
        }
    });

    const btn = document.getElementById("nextChapterBtn");

    if (nextRow) {
        const nextId = nextRow.getAttribute("data-chapterid");
        window.currentChapterId = nextId;
        nextRow.click();
    } else {
        btn.disabled = true;
        btn.innerText = "You've reached to the end";
        btn.classList.add("end-of-series");
    }
}

// Chương trước
function prevChapter() {
    const allChapters = document.querySelectorAll(".chapter-row");
    const currentId = window.currentChapterId;
    let found = false;
    let prevRow = null;

    allChapters.forEach((row, index) => {
        const chapId = row.getAttribute("data-chapterid");
        if (chapId === currentId && !found) {
            found = true;
            if (index > 0) {
                prevRow = allChapters[index - 1];
            }
        }
    });

    if (prevRow) {
        const prevId = prevRow.getAttribute("data-chapterid");
        window.currentChapterId = prevId;
        prevRow.click();
    }
}

// Manga Viewer navigation
function prevImage() {
    if (currentImageIndex > 0 && !isLoading) {
        currentImageIndex--;
        updateImageDisplay();
    }
}

function nextImage() {
    if (currentImageIndex < currentChapterImages.length - 1 && !isLoading) {
        currentImageIndex++;
        updateImageDisplay();
    }
}

function updateImageDisplay() {
    isLoading = true;
    const viewer = document.querySelector('.manga-viewer');

    if (viewer) {
        viewer.innerHTML = `
            <button class="nav-button prev-button" onclick="prevImage()" ${currentImageIndex === 0 ? 'disabled' : ''}>&lt;</button>
            <div class="image-container loading">
                <img 
                    src="/Content/Images/Manga/${currentChapterImages[currentImageIndex]}" 
                    class="current-image" 
                    alt="Page ${currentImageIndex + 1}" 
                    onload="imageLoaded()"
                    onerror="imageError()"
                />
            </div>
            <button class="nav-button next-button" onclick="nextImage()" ${currentImageIndex === currentChapterImages.length - 1 ? 'disabled' : ''}>&gt;</button>
            <div class="page-indicator">${currentImageIndex + 1}/${currentChapterImages.length}</div>
        `;
    }
}

function imageLoaded() {
    isLoading = false;
    const container = document.querySelector('.image-container');
    if (container) container.classList.remove('loading');
}

function imageError() {
    isLoading = false;
    const container = document.querySelector('.image-container');
    if (container) {
        container.classList.remove('loading');
        container.innerHTML = '<p style="color:red;">Error loading image</p>';
    }
}
