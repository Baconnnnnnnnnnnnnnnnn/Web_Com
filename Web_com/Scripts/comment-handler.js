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

// Tim truyện
function toggleFavorite() {
    const btn = document.getElementById("favoriteBtn");
    const icon = btn.querySelector("i");

    const isAdded = btn.classList.contains("added");

    if (isAdded) {
        // Đang là favorite → hủy
        icon.classList.remove("fa-heart");
        icon.classList.add("fa-heart-o");
        btn.innerHTML = '<i class="fa fa-heart-o"></i> Add to Favorite';
    } else {
        // Chưa favorite → thêm
        icon.classList.remove("fa-heart-o");
        icon.classList.add("fa-heart");
        btn.innerHTML = '<i class="fa fa-heart"></i> Remove from Favorite';
    }

    btn.classList.toggle("added");
}

document.addEventListener('DOMContentLoaded', function () {
    const heartBtn = document.getElementById("heart-btn");
    if (!heartBtn) return;

    const icon = heartBtn.querySelector("i");
    const countSpan = document.getElementById("heart-count");
    const workId = heartBtn.dataset.workid;
    let isHearted = heartBtn.dataset.hearted === "True" || heartBtn.dataset.hearted === "true";

    heartBtn.addEventListener("click", function () {
        const formData = new URLSearchParams();
        formData.append("workId", workId);

        fetch('/Work/HeartWork', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    isHearted = data.isHearted;
                    icon.className = isHearted ? "fas fa-heart" : "far fa-heart";
                    countSpan.innerText = data.heartCount;

                    if (isHearted) {
                        heartBtn.classList.add("hearted");
                    } else {
                        heartBtn.classList.remove("hearted");
                    }
                } else {
                    Swal.fire("Lỗi", data.message, "info");
                }
            })
            .catch(err => {
                console.error("Heart error:", err);
                Swal.fire("Lỗi", "Không thể xử lý yêu cầu.", "error");
            });
    });
});

// Theo dõi truyện
document.addEventListener('DOMContentLoaded', function () {
    const favBtn = document.getElementById("favorite-btn");
    if (!favBtn) return;

    const icon = favBtn.querySelector("i");
    const countSpan = document.getElementById("favorite-count");
    const workId = favBtn.dataset.workid;
    let isFavorited = favBtn.dataset.favorited === "True" || favBtn.dataset.favorited === "true";

    favBtn.addEventListener("click", function () {
        const formData = new URLSearchParams();
        formData.append("workId", workId);

        fetch('/Work/ToggleFavorite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    isFavorited = data.isFavorited;
                    favBtn.classList.toggle("favorited", isFavorited);
                    icon.className = isFavorited ? "fas fa-bookmark" : "far fa-bookmark";
                    countSpan.innerText = parseInt(countSpan.innerText) + (isFavorited ? 1 : -1);
                } else {
                    Swal.fire("Lỗi", data.message, "info");
                }
            })
            .catch(err => {
                console.error("Favorite error:", err);
                Swal.fire("Lỗi", "Không thể xử lý yêu cầu.", "error");
            });
    });
});

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

document.addEventListener('DOMContentLoaded', function () {
    // Xử lý thả tim bình luận
    const commentHeartButtons = document.querySelectorAll('.comment-heart');
    commentHeartButtons.forEach(button => {
        button.addEventListener('click', function () {
            const commentId = this.dataset.commentid;
            const isHearted = this.dataset.hearted === 'True' || this.dataset.hearted === 'true';
            const icon = this.querySelector('i');
            const countSpan = this.querySelector('.heart-count');

            const formData = new URLSearchParams();
            formData.append('commentId', commentId);

            fetch('/Work/HeartComment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        this.dataset.hearted = data.isHearted;
                        icon.className = data.isHearted ? 'fas fa-heart' : 'far fa-heart';
                        icon.style.color = data.isHearted ? 'red' : 'gray';
                        countSpan.innerText = data.heartCount;
                    } else {
                        Swal.fire('Lỗi', data.message, 'error');
                    }
                })
                .catch(err => {
                    console.error('Comment heart error:', err);
                    Swal.fire('Lỗi', 'Không thể xử lý yêu cầu.', 'error');
                });
        });
    });

    // Logic hiện có (giữ nguyên)
    const commentSubmitBtn = document.getElementById("comment-submit");
    const commentBox = document.getElementById("comment-box");
    const workId = commentSubmitBtn?.dataset.workid;

    if (commentSubmitBtn && commentBox) {
        commentSubmitBtn.addEventListener("click", function () {
            const commentContent = commentBox.value.trim();

            if (!commentContent) {
                Swal.fire("Lỗi", "Nội dung bình luận không được để trống.", "warning");
                return;
            }

            const formData = new URLSearchParams();
            formData.append("workId", workId);
            formData.append("commentContent", commentContent);

            fetch('/Work/AddComment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const commentList = document.getElementById("comment-list");
                        const commentDiv = document.createElement("div");
                        commentDiv.className = "comment-item";

                        let formattedDate = "Vừa xong";
                        try {
                            const createdDate = new Date(data.comment.Work_CommentCreated);
                            if (!isNaN(createdDate.getTime())) {
                                formattedDate = createdDate.toLocaleString('vi-VN', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                });
                            }
                        } catch (e) {
                            console.error("Lỗi định dạng ngày tháng:", e);
                        }

                        commentDiv.innerHTML = `
                            <div class="comment-header">
                                <img src="${data.comment.UserAvatar.startsWith('/') ? data.comment.UserAvatar : '/Content/Images/Avatar/' + data.comment.UserAvatar}" 
                                     alt="Avatar" class="comment-avatar">
                                <span class="comment-username">
                                    ${data.comment.UserName}
                                    ${data.comment.IsApproved ? '<i class="fas fa-check-circle" style="color: green; margin-left: 5px;" title="Đã được phê duyệt"></i>' : ''}
                                    <span class="comment-heart" data-commentid="${data.comment.Work_CommentId}" data-hearted="false">
                                        <i class="far fa-heart" style="color: gray; cursor: pointer;"></i>
                                        <span class="heart-count">0</span>
                                    </span>
                                </span>
                                <span class="comment-date">${formattedDate}</span>
                            </div>
                            <div class="comment-content">${data.comment.Work_CommentContent}</div>
                        `;
                        commentList.prepend(commentDiv);
                        commentBox.value = "";

                        // Thêm sự kiện cho nút tim của bình luận mới
                        const newHeartButton = commentDiv.querySelector('.comment-heart');
                        newHeartButton.addEventListener('click', function () {
                            const commentId = this.dataset.commentid;
                            const isHearted = this.dataset.hearted === 'True' || this.dataset.hearted === 'true';
                            const icon = this.querySelector('i');
                            const countSpan = this.querySelector('.heart-count');

                            const formData = new URLSearchParams();
                            formData.append('commentId', commentId);

                            fetch('/Work/HeartComment', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: formData.toString()
                            })
                                .then(res => res.json())
                                .then(data => {
                                    if (data.success) {
                                        this.dataset.hearted = data.isHearted;
                                        icon.className = data.isHearted ? 'fas fa-heart' : 'far fa-heart';
                                        icon.style.color = data.isHearted ? 'red' : 'gray';
                                        countSpan.innerText = data.heartCount;
                                    } else {
                                        Swal.fire('Lỗi', data.message, 'error');
                                    }
                                })
                                .catch(err => {
                                    console.error('Comment heart error:', err);
                                    Swal.fire('Lỗi', 'Không thể xử lý yêu cầu.', 'error');
                                });
                        });
                    } else {
                        Swal.fire("Lỗi", data.message, "error");
                    }
                })
                .catch(err => {
                    console.error("Comment error:", err);
                    Swal.fire("Lỗi", "Không thể gửi bình luận.", "error");
                });
        });
    }
});

