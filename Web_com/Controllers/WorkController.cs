using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Web_com.Models.Entities;
using Web_com.Models.ModelView;

namespace Web_com.Controllers
{
    public class WorkController : Controller
    {
        private web_comEntities db = new web_comEntities();

        // GET: Work/Arc/{workId}
        public ActionResult Arc(int? workId)
        {
            int currentUserId = (int)Session["UserId"];

            if (workId == null)
            {
                return HttpNotFound("Work ID is required.");
            }

            var work = db.works.FirstOrDefault(w => w.workId == workId);
            if (work == null)
            {
                return HttpNotFound("Work not found.");
            }

            var genre = db.genres.FirstOrDefault(g => g.genreId == work.genreId);
            var genreName = genre != null ? genre.genreName : "Unknown";

            var status = db.work_Status.FirstOrDefault(s => s.work_StatusId == work.work_StatusId);
            var statusName = status != null ? status.work_StatusName : "Unknown";

            var tags = (from wt in db.work_Tag
                        join t in db.tags on wt.tagId equals t.tagId
                        where wt.workId == workId
                        select t.tagName).ToList();
            var tagsString = tags.Any() ? string.Join(", ", tags) : "None";

            var author = db.users.FirstOrDefault(u => u.usersId == work.authorId);
            var authorName = author != null ? author.usersName : "Unknown";

            var arcs = db.work_Arc
                .Where(a => a.work_Id == workId)
                .ToList();

            var arcIds = arcs.Select(a => a.work_ArcId).ToList();

            var chapters = arcIds.Any()
                ? db.work_Chapter
                    .Where(c => arcIds.Contains(c.work_ArcId ?? 0))
                    .ToList()
                : new List<work_Chapter>();

            // Lấy danh sách bình luận
            var comments = db.work_Comment
                .Where(c => c.workId == workId && c.work_CommentIsDeleted == false)
                .Select(c => new CommentViewModel
                {
                    Work_CommentId = c.work_CommentId,
                    Work_CommentContent = c.work_CommentContent,
                    Work_CommentCreated = ((DateTime)c.work_CommentCreated),
                    UserName = c.user.usersName,
                    UserAvatar = c.user.usersAvatar ?? "/Content/Images/Avatar/DefaultAvatar.png",
                    IsApproved = c.work_CommentIsApproved ?? false,
                    HeartCount = db.comment_Heart.Count(h => h.work_CommentId == c.work_CommentId),
                    HasHearted = db.comment_Heart.Any(h => h.work_CommentId == c.work_CommentId && h.usersId == currentUserId)
                })
                .OrderByDescending(c => c.Work_CommentCreated)
                .ToList();

            ViewBag.Chapters = chapters;
            ViewBag.WorkId = workId;
            ViewBag.WorkName = work.workName;
            ViewBag.WorkImage = work.workImage;
            ViewBag.WorkOverview = work.workOverview;
            ViewBag.WorkCreated = work.workCreated != null
                ? ((DateTime)work.workCreated).ToString("dd/MM/yyyy")
                : "Unknown";
            ViewBag.AuthorId = work.authorId;
            ViewBag.Genre = genreName;
            ViewBag.Status = statusName;
            ViewBag.Tags = tagsString;
            ViewBag.Author = authorName;
            ViewBag.HeartCount = db.work_Heart.Count(h => h.workId == workId);
            ViewBag.HasHearted = db.work_Heart.Any(h => h.userId == currentUserId && h.workId == workId);
            ViewBag.FavoriteCount = db.work_Favorite.Count(f => f.workId == workId);
            ViewBag.IsFavorited = db.work_Favorite.Any(f => f.userId == currentUserId && f.workId == workId);
            ViewBag.Comments = comments;

            return View(arcs);
        }

        // GET: Work/Chapter/{workId}
        public ActionResult Chapter(int? workId)
        {
            if (workId == null)
            {
                return HttpNotFound("Work ID is required.");
            }

            var work = db.works.FirstOrDefault(w => w.workId == workId);
            if (work == null)
            {
                return HttpNotFound("Work not found.");
            }

            var genre = db.genres.FirstOrDefault(g => g.genreId == work.genreId);
            var genreName = genre != null ? genre.genreName : "Unknown";

            var status = db.work_Status.FirstOrDefault(s => s.work_StatusId == work.work_StatusId);
            var statusName = status != null ? status.work_StatusName : "Unknown";

            var tags = (from wt in db.work_Tag
                        join t in db.tags on wt.tagId equals t.tagId
                        where wt.workId == workId
                        select t.tagName).ToList();
            var tagsString = tags.Any() ? string.Join(", ", tags) : "None";

            var author = db.users.FirstOrDefault(u => u.usersId == work.authorId);
            var authorName = author != null ? author.usersName : "Unknown";

            var arcs = db.work_Arc
                .Where(a => a.work_Id == workId)
                .ToList();

            var arcIds = arcs.Select(a => a.work_ArcId).ToList();

            var chapters = arcIds.Any()
                ? db.work_Chapter
                    .Where(c => arcIds.Contains(c.work_ArcId ?? 0))
                    .ToList()
                : new List<work_Chapter>();

            var chapterImages = db.work_ChapterImage
                .Where(i => arcIds.Contains(i.work_ChapterId))
                .ToList();

            ViewBag.Chapters = chapters;
            ViewBag.WorkId = workId;
            ViewBag.WorkName = work.workName;
            ViewBag.Genre = genreName;
            ViewBag.Status = statusName;
            ViewBag.Tags = tagsString;
            ViewBag.Author = authorName;
            ViewBag.ChapterImages = chapterImages;
            return View(chapters);
        }

        // POST: Work/Comment
        [HttpPost]
        public JsonResult AddComment(int workId, string commentContent)
        {
            try
            {
                if (Session["UserId"] == null)
                {
                    return Json(new { success = false, message = "Bạn cần đăng nhập để bình luận." }, JsonRequestBehavior.AllowGet);
                }

                if (string.IsNullOrWhiteSpace(commentContent))
                {
                    return Json(new { success = false, message = "Nội dung bình luận không được để trống." }, JsonRequestBehavior.AllowGet);
                }

                int userId = (int)Session["UserId"];

                using (var db = new web_comEntities())
                {
                    var comment = new work_Comment
                    {
                        workId = workId,
                        userId = userId,
                        work_CommentContent = commentContent,
                        work_CommentCreated = DateTime.Now,
                        work_CommentIsApproved = false,
                        work_CommentIsDeleted = false
                    };

                    db.work_Comment.Add(comment);
                    db.SaveChanges();

                    var user = db.users.FirstOrDefault(u => u.usersId == userId);
                    var newComment = new CommentViewModel
                    {
                        Work_CommentId = comment.work_CommentId,
                        Work_CommentContent = comment.work_CommentContent,
                        Work_CommentCreated = comment.work_CommentCreated ?? DateTime.Now, // Xử lý nul
                        UserName = user?.usersName ?? "Unknown",
                        UserAvatar = user?.usersAvatar ?? "/Content/Images/Avatar/DefaultAvatar.png"
                    };

                    return Json(new { success = true, comment = newComment }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        public ActionResult ArcGuest(int? workId)
        {
            if (workId == null)
            {
                return HttpNotFound("Work ID is required.");
            }

            var work = db.works.FirstOrDefault(w => w.workId == workId);
            if (work == null)
            {
                return HttpNotFound("Work not found.");
            }

            var genre = db.genres.FirstOrDefault(g => g.genreId == work.genreId);
            var genreName = genre != null ? genre.genreName : "Unknown";

            var status = db.work_Status.FirstOrDefault(s => s.work_StatusId == work.work_StatusId);
            var statusName = status != null ? status.work_StatusName : "Unknown";

            var tags = (from wt in db.work_Tag
                        join t in db.tags on wt.tagId equals t.tagId
                        where wt.workId == workId
                        select t.tagName).ToList();
            var tagsString = tags.Any() ? string.Join(", ", tags) : "None";

            var author = db.users.FirstOrDefault(u => u.usersId == work.authorId);
            var authorName = author != null ? author.usersName : "Unknown";

            var arcs = db.work_Arc
                .Where(a => a.work_Id == workId)
                .ToList();

            var arcIds = arcs.Select(a => a.work_ArcId).ToList();

            var chapters = arcIds.Any()
                ? db.work_Chapter
                    .Where(c => arcIds.Contains(c.work_ArcId ?? 0))
                    .ToList()
                : new List<work_Chapter>();

            var comments = db.work_Comment
                .Where(c => c.workId == workId && c.work_CommentIsDeleted == false)
                .Select(c => new CommentViewModel
                {
                    Work_CommentId = c.work_CommentId,
                    Work_CommentContent = c.work_CommentContent,
                    Work_CommentCreated = ((DateTime)c.work_CommentCreated),
                    UserName = c.user.usersName,
                    UserAvatar = c.user.usersAvatar ?? "/Content/Images/Avatar/DefaultAvatar.png",
                    IsApproved = c.work_CommentIsApproved ?? false,
                    HeartCount = db.comment_Heart.Count(h => h.work_CommentId == c.work_CommentId),
                    HasHearted = false // Người dùng khách không thể thả tim
                })
                .OrderByDescending(c => c.Work_CommentCreated)
                .ToList();

            ViewBag.Chapters = chapters;
            ViewBag.WorkId = workId;
            ViewBag.WorkName = work.workName;
            ViewBag.WorkImage = work.workImage;
            ViewBag.WorkOverview = work.workOverview;
            ViewBag.WorkCreated = work.workCreated != null
                ? ((DateTime)work.workCreated).ToString("dd/MM/yyyy")
                : "Unknown";
            ViewBag.Genre = genreName;
            ViewBag.Status = statusName;
            ViewBag.Tags = tagsString;
            ViewBag.Author = authorName;
            ViewBag.AuthorId = work.authorId;
            ViewBag.Comments = comments;

            ViewBag.HeartCount = db.work_Heart.Count(h => h.workId == workId);
            ViewBag.FavoriteCount = db.work_Favorite.Count(f => f.workId == workId);
            
            return View(arcs);
        }

        [HttpGet]
        public JsonResult GetChapterImages(int chapterId)
        {
            var images = db.work_ChapterImage
                .Where(i => i.work_ChapterId == chapterId)
                .OrderBy(i => i.work_ChapterImageOrder)
                .Select(i => i.work_ChapterImageName)
                .ToList();

            return Json(images, JsonRequestBehavior.AllowGet);
        }

        [HttpPost]
        public JsonResult HeartWork(int workId)
        {
            try
            {
                if (Session["UserId"] == null)
                {
                    return Json(new { success = false, message = "Session bị mất. Bạn cần đăng nhập lại." }, JsonRequestBehavior.AllowGet);
                }

                int userId = (int)Session["UserId"];

                using (var db = new web_comEntities())
                {
                    var existing = db.work_Heart.FirstOrDefault(h => h.userId == userId && h.workId == workId);
                    bool isHearted;

                    if (existing == null)
                    {
                        db.work_Heart.Add(new work_Heart { userId = userId, workId = workId });
                        isHearted = true;
                    }
                    else
                    {
                        db.work_Heart.Remove(existing);
                        isHearted = false;
                    }

                    db.SaveChanges();

                    int heartCount = db.work_Heart.Count(h => h.workId == workId);
                    return Json(new { success = true, isHearted, heartCount }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult HeartComment(int commentId)
        {
            try
            {
                if (Session["UserId"] == null)
                {
                    return Json(new { success = false, message = "Bạn cần đăng nhập để thả tim bình luận." }, JsonRequestBehavior.AllowGet);
                }

                int userId = (int)Session["UserId"];

                using (var db = new web_comEntities())
                {
                    var existing = db.comment_Heart.FirstOrDefault(h => h.usersId == userId && h.work_CommentId == commentId);
                    bool isHearted;

                    if (existing == null)
                    {
                        db.comment_Heart.Add(new comment_Heart { usersId = userId, work_CommentId = commentId });
                        isHearted = true;
                    }
                    else
                    {
                        db.comment_Heart.Remove(existing);
                        isHearted = false;
                    }

                    db.SaveChanges();

                    int heartCount = db.comment_Heart.Count(h => h.work_CommentId == commentId);
                    return Json(new { success = true, isHearted, heartCount }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult ToggleFavorite(int workId)
        {
            try
            {
                int userId = (int)Session["UserId"];

                using (var db = new web_comEntities())
                {
                    var existing = db.work_Favorite.FirstOrDefault(f => f.userId == userId && f.workId == workId);
                    bool isFavorited;

                    if (existing == null)
                    {
                        db.work_Favorite.Add(new work_Favorite { userId = userId, workId = workId });
                        isFavorited = true;
                    }
                    else
                    {
                        db.work_Favorite.Remove(existing);
                        isFavorited = false;
                    }

                    db.SaveChanges();
                    return Json(new { success = true, isFavorited }, JsonRequestBehavior.AllowGet);
                }
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
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