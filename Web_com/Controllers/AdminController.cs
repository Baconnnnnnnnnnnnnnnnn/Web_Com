using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Web_com.Models.Entities;
using Web_com.Models.ModelView;

namespace Web_com.Controllers
{
    public class AdminController : Controller
    {
        private web_comEntities db = new web_comEntities();
        // GET: Admin
        public ActionResult SuperAdmin()
        {
            return View();
        }
        public ActionResult AccountAdmin()
        {
            var users = db.users
                .Select(u => new UserSummaryViewModel
                {
                    UsersId = u.usersId,
                    UsersName = u.usersName,
                    UsersEmail = u.usersEmail,
                    UsersPass = u.usersPass,
                    UsersCreated = u.usersCreated,
                    UsersAvatar = u.usersAvatar,
                    UsersCover = u.usersCover,
                    IsAuthor = u.isAuthor,
                    IsDisabled = u.isDisabled
                })
                .OrderBy(u => u.UsersName)
                .ToList();

            return View(users);
        }

        public ActionResult CommentAdmin()
        {
            var comments = db.work_Comment
                .Where(c => c.work_CommentIsDeleted == false)
                .Select(c => new CommentAdminViewModel
                {
                    Work_CommentId = c.work_CommentId,
                    UserName = c.user != null ? c.user.usersName : "Unknown",
                    UserAvatar = c.user != null ? (c.user.usersAvatar ?? "/Content/Images/Avatar/DefaultAvatar.png") : "/Content/Images/Avatar/DefaultAvatar.png",
                    Work_CommentContent = c.work_CommentContent,
                    Work_CommentCreated = c.work_CommentCreated ?? DateTime.Now,
                    HeartCount = db.comment_Heart.Count(h => h.work_CommentId == c.work_CommentId),
                    WorkName = c.work != null ? c.work.workName : "Unknown",
                    IsApproved = c.work_CommentIsApproved ?? false,
                    IsDeleted = c.work_CommentIsDeleted ?? false
                })
                .OrderByDescending(c => c.Work_CommentCreated)
                .ToList();

            return View(comments);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ApproveComment(int commentId, bool approve)
        {
            try
            {
                var comment = db.work_Comment.Find(commentId);
                if (comment == null)
                {
                    return Json(new { success = false, message = "Comment does not exist" });
                }

                comment.work_CommentIsApproved = approve;
                db.SaveChanges();
                return Json(new { success = true, message = approve ? "Comment has been approved" : "Comment has been unapproved" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteComment(int commentId)
        {
            try
            {
                var comment = db.work_Comment.Find(commentId);
                if (comment == null)
                {
                    return Json(new { success = false, message = "Comment does not exist" });
                }

                comment.work_CommentIsDeleted = true;
                db.SaveChanges();
                return Json(new { success = true, message = "Comment has been deleted" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        public ActionResult ComplainAdmin()
        {
            return View();
        }

        // POST: Admin/DisableUser - Handle user disable (AJAX)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DisableUser(int usersId)
        {
            try
            {
                var user = db.users.Find(usersId);
                if (user == null)
                {
                    return Json(new { success = false, message = "User not found." });
                }

                user.isDisabled = true;
                db.SaveChanges();
                return Json(new { success = true, message = "User disabled successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EnableUser(int usersId)
        {
            try
            {
                var user = db.users.Find(usersId);
                if (user == null)
                {
                    return Json(new { success = false, message = "User not found." });
                }

                user.isDisabled = false;
                db.SaveChanges();
                return Json(new { success = true, message = "User enabled successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        // POST: Admin/DeleteUser - Handle user deletion (AJAX)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteUser(int usersId)
        {
            try
            {
                var user = db.users.FirstOrDefault(u => u.usersId == usersId);
                if (user == null)
                {
                    return Json(new { success = false, message = "User not found." });
                }

                // Remove related data (e.g., works, comments, etc.)
                if (user.isAuthor == true)
                {
                    // Xóa tất cả tác phẩm của tác giả
                    var works = db.works.Where(w => w.authorId == usersId).ToList();
                    foreach (var work in works)
                    {
                        // Xóa các chapter và hình ảnh liên quan
                        var chapters = db.work_Chapter.Where(c => c.work_Arc.work_Id == work.workId).ToList();
                        foreach (var chapter in chapters)
                        {
                            var images = db.work_ChapterImage.Where(i => i.work_ChapterId == chapter.work_ChapterId).ToList();
                            db.work_ChapterImage.RemoveRange(images);
                        }
                        db.work_Chapter.RemoveRange(chapters);

                        // Xóa các arc
                        var arcs = db.work_Arc.Where(a => a.work_Id == work.workId).ToList();
                        db.work_Arc.RemoveRange(arcs);

                        // Xóa các tag
                        var tags = db.work_Tag.Where(t => t.workId == work.workId).ToList();
                        db.work_Tag.RemoveRange(tags);

                        db.works.Remove(work);
                    }
                }

                db.author_Follow.RemoveRange(db.author_Follow.Where(af => af.authorId == usersId || af.followerId == usersId));
                db.user_Badge.RemoveRange(db.user_Badge.Where(ub => ub.userId == usersId));
                db.user_Warning.RemoveRange(db.user_Warning.Where(uw => uw.userId == usersId));
                db.user_History.RemoveRange(db.user_History.Where(uh => uh.userId == usersId));
                db.author_Warning.RemoveRange(db.author_Warning.Where(aw => aw.authorId == usersId));
                db.comment_Heart.RemoveRange(db.comment_Heart.Where(ch => ch.usersId == usersId));
                db.work_Comment.RemoveRange(db.work_Comment.Where(wc => wc.userId == usersId));
                db.work_Heart.RemoveRange(db.work_Heart.Where(wh => wh.userId == usersId));
                db.work_View.RemoveRange(db.work_View.Where(wv => wv.usersId == usersId));
                db.work_Favorite.RemoveRange(db.work_Favorite.Where(f => f.userId == usersId));

                db.users.Remove(user);
                db.SaveChanges();

                return Json(new { success = true, message = "User deleted successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
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