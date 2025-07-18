function loadChapterContent(chapterId) {
    const chapter = document.querySelector(`li[onclick="loadChapterContent('${chapterId}')"]`);
    const content = chapter.getAttribute("data-content");
    const contentBox = document.getElementById("chapter-content-box");

    contentBox.innerHTML = `
        <h3>${chapter.innerText}</h3>
        <div class="novel-paragraph">${content}</div>
    `;
}
