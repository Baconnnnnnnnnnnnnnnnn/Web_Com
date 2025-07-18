// Toggle chapters for an arc
function toggleChapters(arcId) {
    const row = document.getElementById(`chapters-${arcId}`);
    if (row) {
        row.style.display = row.style.display === "none" ? "table-row" : "none";
    }
}

// Scroll to top logic
document.addEventListener("DOMContentLoaded", function () {
    const btnTop = document.getElementById("btnTop");
    if (!btnTop) return;

    btnTop.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
});

// Zoom image logic
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

let currentChapterImages = [];
let currentImageIndex = 0;
let isLoading = false;

function showChapterContent(chapterId) {
    const row = document.querySelector(`.chapter-row[onclick*="${chapterId}"]`);
    if (!row) return;

    const isImage = row.getAttribute('data-isimage')?.toLowerCase() === "true";
    const title = row.getAttribute('data-title') ?? "";
    const displayBox = document.getElementById('chapter-content-box');
    if (!displayBox) return;

    if (isImage) {
        // Show loading state
        displayBox.innerHTML = `
            <h3>${title}</h3>
            <div class="manga-viewer">
                <button class="nav-button prev-button" disabled>&lt;</button>
                <div class="image-container loading"></div>
                <button class="nav-button next-button" disabled>&gt;</button>
            </div>
        `;

        fetch(`/ContentAdmin/GetChapterImages?chapterId=${chapterId}`)
            .then(res => {
                if (!res.ok) throw new Error("HTTP Error " + res.status);
                return res.json();
            })
            .then(result => {
                if (!result.success || !result.images || result.images.length === 0) {
                    displayBox.innerHTML = `<h3>${title}</h3><p style="color:yellow;">Không tìm thấy ảnh.</p>`;
                    return;
                }

                currentChapterImages = result.images;
                currentImageIndex = 0;
                updateImageDisplay();
            })
            .catch(err => {
                console.error("Image fetch error:", err);
                displayBox.innerHTML = `<h3>${title}</h3><p style="color:red;">Lỗi khi tải ảnh chương.</p>`;
            });

    } else {
        // Light novel display
        const content = row.getAttribute('data-content')?.replaceAll("&#10;", "\n") ?? "";
        displayBox.innerHTML = `<h3>${title}</h3><div class="novel-content">${content}</div>`;
    }
}

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
                    onclick="zoomImage(this.src)"
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