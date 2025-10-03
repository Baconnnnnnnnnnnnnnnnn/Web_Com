using System;
using System.Linq;
using System.Web.Mvc;
using Web_com.Models.Entities;

namespace Web_com.Controllers
{
    public class NotificationController : Controller
    {
        private web_comEntities db = new web_comEntities();

        [HttpGet]
        public JsonResult GetNotifications()
        {
            if (Session["UserId"] == null)
                return Json(new { error = "Not logged in" }, JsonRequestBehavior.AllowGet);

            int userId = (int)Session["UserId"];
            var notifications = (from n in db.user_Notification
                                 where n.userId == userId
                                 orderby n.user_NotificationCreated descending
                                 select new
                                 {
                                     n.user_NotificationId,
                                     n.user_NotificationType,
                                     n.user_NotificationCreated,
                                     n.isRead,
                                     ActorName = n.actorId != null ? n.user.usersName : "System",
                                     ActorAvatar = n.actorId != null ? n.user.usersAvatar : "DefaultAvatar.png",
                                     WorkName = n.workId != null ? n.work.workName : null
                                 }).Take(20).ToList();

            var unreadCount = db.user_Notification.Count(n => n.userId == userId && (n.isRead == false));

            return Json(new { notifications, unreadCount }, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult MarkAsRead(int notificationId)
        {
            if (Session["UserId"] == null)
                return Json(new { success = false, message = "Not logged in" });

            int userId = (int)Session["UserId"];
            var notification = db.user_Notification.FirstOrDefault(n => n.user_NotificationId == notificationId && n.userId == userId);
            if (notification != null)
            {
                notification.isRead = true;
                db.SaveChanges();
                return Json(new { success = true });
            }
            return Json(new { success = false, message = "Not found" });
        }

        [HttpPost]
        public JsonResult MarkAllAsRead()
        {
            if (Session["UserId"] == null)
                return Json(new { success = false, message = "Not logged in" });

            int userId = (int)Session["UserId"];
            var unread = db.user_Notification.Where(n => n.userId == userId && (n.isRead == false || n.isRead == null)).ToList();
            foreach (var n in unread) n.isRead = true;
            db.SaveChanges();

            return Json(new { success = true, count = unread.Count });
        }

        [HttpGet]
        public JsonResult GetUnreadCount()
        {
            int userId = (int)Session["UserId"];
            using (var db = new web_comEntities())
            {
                int count = db.user_Notification
                              .Count(n => n.userId == userId && (n.isRead == false));
                return Json(new { success = true, count }, JsonRequestBehavior.AllowGet);
            }
        }
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}
