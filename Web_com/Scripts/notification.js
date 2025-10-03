class NotificationManager {
    constructor() {
        this.container = document.querySelector(".notification-menu");
        this.list = document.querySelector(".notification-list");
        this.countBadge = document.getElementById("notification-count");
        this.icon = document.querySelector(".notification-dropdown .fa-bell");

        this.init();
    }

    init() {
        if (!this.container || !this.icon) return;

        this.loadNotifications();

        // Hover to show dropdown & load notifications
        this.icon.addEventListener("mouseenter", () => {
            this.icon.classList.add("shake");
            setTimeout(() => this.icon.classList.remove("shake"), 600);

            this.container.style.display = "block";
            this.loadNotifications();
        });

        // Hide when leaving
        this.icon.addEventListener("mouseleave", () => {
            setTimeout(() => {
                if (!this.container.matches(":hover")) {
                    this.container.style.display = "none";
                }
            }, 300);
        });

        this.container.addEventListener("mouseleave", () => {
            this.container.style.display = "none";
        });

        // Attach event for "Mark all as read"
        const markAllBtn = this.container.querySelector(".mark-all-read");
        if (markAllBtn) {
            markAllBtn.addEventListener("click", () => this.markAllAsRead());
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch("/Notification/GetNotifications", {
                method: "GET",
                headers: { "Accept": "application/json" }
            });

            if (!response.ok) throw new Error("Failed to load notifications");

            const data = await response.json();
            this.renderNotifications(data.notifications);
            this.updateCount(data.unreadCount);
        } catch (error) {
            console.error("Error loading notifications:", error);
            this.list.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications right now...</p>
                </div>`;
            this.updateCount(0);
        }
    }

    renderNotifications(notifications) {
        this.list.innerHTML = "";

        if (!notifications || notifications.length === 0) {
            this.list.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications right now...</p>
                </div>`;
            return;
        }

        notifications.forEach(n => {
            const rawDate = typeof n.user_NotificationCreated === "string"
                ? n.user_NotificationCreated.replace(/\/Date\((\d+)\)\//, "$1")
                : n.user_NotificationCreated;
            const date = new Date(parseInt(rawDate));

            const li = document.createElement("div");
            li.className = "notification-item " + (n.isRead ? "read" : "unread");
            li.setAttribute("data-type", n.user_NotificationType);

            li.innerHTML = `
                <div class="notification-avatar">
                    <img src="/Content/Images/Avatar/${(n.ActorAvatar || "DefaultAvatar.png")}" alt="avatar">
                    <span class="notification-type-icon"></span>
                </div>
                <div class="notification-content">
                    <p class="notification-text">${this.formatMessage(n)}</p>
                    <span class="notification-time">${this.timeAgo(date)}</span>
                </div>
            `;
            li.addEventListener("click", () => this.markAsRead(n.user_NotificationId, li));
            this.list.appendChild(li);
        });
    }

    formatMessage(n) {
        const actor = `<strong>${n.ActorName || "User"}</strong>`;
        const work = n.WorkName ? ` "<em>${n.WorkName}</em>"` : "";

        switch (n.user_NotificationType) {
            case "heart_work":
                return `${actor} liked your work${work}`;
            case "comment":
                return `${actor} commented on your work${work}`;
            case "follow":
                return `${actor} started following you`;
            case "favorite_work":
                return `${actor} favorited your work${work}`;
            case "heart_comment":
                return `${actor} liked your comment in${work}`;
            case "comment_removed":
                return `Your comment on ${work} was removed by admin`;
            case "work_removed":
                return `Your work ${work} was removed by admin`;
            default:
                return n.message || "You have a new notification";
        }
    }

    timeAgo(date) {
        if (!(date instanceof Date) || isNaN(date)) return "";

        const diff = Math.floor((new Date() - date) / 1000);
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return date.toLocaleDateString();
    }

    async markAsRead(id, element) {
        try {
            const response = await fetch("/Notification/MarkAsRead", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationId: id })
            });

            const result = await response.json();
            if (result.success) {
                element.classList.remove("unread");
                element.classList.add("read");
                let current = parseInt(this.countBadge.textContent) || 0;
                this.updateCount(Math.max(0, current - 1));
            }
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    }

    async markAllAsRead() {
        try {
            const response = await fetch("/Notification/MarkAllAsRead", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });

            const result = await response.json();
            if (result.success) {
                document.querySelectorAll(".notif-item.unread")
                    .forEach(el => { el.classList.remove("unread"); el.classList.add("read"); });
                this.updateCount(0);
            }
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    }

    updateCount(count) {
        if (!this.countBadge) return;
        if (count > 0) {
            this.countBadge.textContent = count;
            this.countBadge.style.display = "inline-block";
        } else {
            this.countBadge.style.display = "none";
        }
    }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
    new NotificationManager();
});
