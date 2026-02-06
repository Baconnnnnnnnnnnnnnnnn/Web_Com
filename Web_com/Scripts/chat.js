class ChatUI {
    constructor() {
        this.menu = document.querySelector(".chat-menu");
        this.dropdown = document.querySelector(".chat-dropdown");
        this.icon = document.querySelector(".chat-icon");

        this.init();
    }

    init() {
        if (!this.menu || !this.icon) return;

        this.icon.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Click outside → đóng
        document.addEventListener("click", (e) => {
            if (!this.dropdown.contains(e.target)) {
                this.menu.style.display = "none";
            }
        });
    }

    toggle() {
        const isOpen = this.menu.style.display === "block";

        if (isOpen) {
            this.menu.style.display = "none";
        } else {
            this.menu.style.display = "block";

            // Add shake animation
            this.dropdown.classList.add("shake");
            setTimeout(() => {
                this.dropdown.classList.remove("shake");
            }, 600);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    new ChatUI();
});
