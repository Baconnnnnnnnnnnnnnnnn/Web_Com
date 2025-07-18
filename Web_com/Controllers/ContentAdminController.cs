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
    public class ContentAdminController : Controller
    {
        private web_comEntities db = new web_comEntities();

        public ActionResult ContentAdmin()
        {
            var works = db.works
                .Select(w => new WorkSummaryViewModel
                {
                    WorkId = w.workId,
                    WorkName = w.workName,
                    WorkImage = w.workImage,
                    AuthorName = w.user != null ? w.user.usersName : "Unknown",
                    GenreName = w.genre.genreName,
                    TagNames = w.work_Tag.Select(wt => wt.tag.tagName).ToList(),
                    StatusName = w.work_Status.work_StatusName,
                    IsDisabled = w.isDisabled
                })
                .OrderBy(w => w.WorkName)
                .ToList();

            ViewBag.Statuses = db.work_Status.ToList();
            ViewBag.Genres = db.genres.Select(g => g.genreName).Distinct().ToList();
            ViewBag.Tags = db.tags.ToList();

            return View(works);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DisableWork(int workId)
        {
            try
            {
                var work = db.works.Find(workId);
                if (work == null)
                {
                    return Json(new { success = false, message = "Work not found." });
                }

                work.isDisabled = true;
                db.SaveChanges();
                return Json(new { success = true, message = "Work disabled successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EnableWork(int workId)
        {
            try
            {
                var work = db.works.Find(workId);
                if (work == null)
                {
                    return Json(new { success = false, message = "Work not found." });
                }

                work.isDisabled = false;
                db.SaveChanges();
                return Json(new { success = true, message = "Work enabled successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        public ActionResult AddWork()
        {
            ViewBag.Genres = db.genres.ToList();
            ViewBag.Statuses = db.work_Status.ToList();
            ViewBag.Tags = db.tags.ToList();
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult AddWork(work newWork, HttpPostedFileBase workImage, int[] selectedTags, string authorName)
        {
            if (Request.IsAjaxRequest())
            {
                if (ModelState.IsValid)
                {
                    // Validate that no fields are empty
                    if (string.IsNullOrEmpty(authorName))
                    {
                        return Json(new { success = false, message = "Author name is required." });
                    }

                    if (string.IsNullOrEmpty(newWork.workName))
                    {
                        return Json(new { success = false, message = "Work name is required." });
                    }

                    if (string.IsNullOrEmpty(newWork.workOverview))
                    {
                        return Json(new { success = false, message = "Work overview is required." });
                    }

                    if (newWork.genreId == 0)
                    {
                        return Json(new { success = false, message = "Please select a genre." });
                    }

                    if (newWork.work_StatusId == 0)
                    {
                        return Json(new { success = false, message = "Please select a status." });
                    }

                    if (workImage == null || workImage.ContentLength == 0)
                    {
                        return Json(new { success = false, message = "A cover image is required." });
                    }

                    if (selectedTags == null || !selectedTags.Any())
                    {
                        return Json(new { success = false, message = "At least one tag must be selected." });
                    }

                    // Check for duplicate work name
                    if (db.works.Any(w => w.workName == newWork.workName))
                    {
                        return Json(new { success = false, message = "A work with this name already exists." });
                    }

                    // Check if the author exists
                    var author = db.users.FirstOrDefault(u => u.usersName == authorName);
                    if (author == null)
                    {
                        return Json(new { success = false, message = "Author does not exist. Please ensure the author is already in the database." });
                    }

                    if (author.isAuthor != true)
                    {
                        author.isAuthor = true;
                        db.Entry(author).State = EntityState.Modified;
                    }

                    newWork.authorId = author.usersId;

                    var fileName = Path.GetFileName(workImage.FileName);
                    var path = Path.Combine(Server.MapPath("~/Content/Images/"), fileName);
                    workImage.SaveAs(path);
                    newWork.workImage = fileName;

                    newWork.workCreated = DateTime.Now;
                    newWork.isDisabled = false;
                    db.works.Add(newWork);
                    db.SaveChanges();

                    // Add selected tags to the work
                    foreach (var tagId in selectedTags)
                    {
                        db.work_Tag.Add(new work_Tag
                        {
                            workId = newWork.workId,
                            tagId = tagId
                        });
                    }
                    db.SaveChanges();

                    return Json(new { success = true, message = "The work has been added successfully." });
                }

                // If model state is invalid, return the validation errors
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return Json(new { success = false, message = errors.Any() ? string.Join("; ", errors) : "Invalid input." });
            }

            // Fallback for non-AJAX requests (though this should rarely be used)
            if (ModelState.IsValid)
            {
                if (string.IsNullOrEmpty(authorName))
                {
                    ModelState.AddModelError("authorName", "Author name is required.");
                    ViewBag.Genres = db.genres.ToList();
                    ViewBag.Statuses = db.work_Status.ToList();
                    ViewBag.Tags = db.tags.ToList();
                    return View(newWork);
                }

                if (workImage == null || workImage.ContentLength == 0)
                {
                    ModelState.AddModelError("workImage", "A cover image is required.");
                    ViewBag.Genres = db.genres.ToList();
                    ViewBag.Statuses = db.work_Status.ToList();
                    ViewBag.Tags = db.tags.ToList();
                    return View(newWork);
                }

                if (selectedTags == null || !selectedTags.Any())
                {
                    ModelState.AddModelError("selectedTags", "At least one tag must be selected.");
                    ViewBag.Genres = db.genres.ToList();
                    ViewBag.Statuses = db.work_Status.ToList();
                    ViewBag.Tags = db.tags.ToList();
                    return View(newWork);
                }

                if (db.works.Any(w => w.workName == newWork.workName))
                {
                    ModelState.AddModelError("workName", "A work with this name already exists.");
                    ViewBag.Genres = db.genres.ToList();
                    ViewBag.Statuses = db.work_Status.ToList();
                    ViewBag.Tags = db.tags.ToList();
                    return View(newWork);
                }

                var author = db.users.FirstOrDefault(u => u.usersName == authorName);
                if (author == null)
                {
                    ModelState.AddModelError("authorName", "Author does not exist. Please ensure the author is already in the database.");
                    ViewBag.Genres = db.genres.ToList();
                    ViewBag.Statuses = db.work_Status.ToList();
                    ViewBag.Tags = db.tags.ToList();
                    return View(newWork);
                }

                newWork.authorId = author.usersId;

                var fileName = Path.GetFileName(workImage.FileName);
                var path = Path.Combine(Server.MapPath("~/Content/Images/"), fileName);
                workImage.SaveAs(path);
                newWork.workImage = fileName;

                newWork.workCreated = DateTime.Now;
                newWork.isDisabled = false;
                db.works.Add(newWork);
                db.SaveChanges();

                foreach (var tagId in selectedTags)
                {
                    db.work_Tag.Add(new work_Tag
                    {
                        workId = newWork.workId,
                        tagId = tagId
                    });
                }
                db.SaveChanges();

                return RedirectToAction("ContentAdmin", "ContentAdmin");
            }

            ViewBag.Genres = db.genres.ToList();
            ViewBag.Statuses = db.work_Status.ToList();
            ViewBag.Tags = db.tags.ToList();
            return View(newWork);
        }

        // GET: Admin/EditWork - Display form to edit an existing work
        public ActionResult EditWork(int? workId)
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

            ViewBag.Genres = db.genres.ToList();
            ViewBag.Statuses = db.work_Status.ToList();
            ViewBag.Tags = db.tags.ToList();
            ViewBag.SelectedTags = db.work_Tag
                .Where(wt => wt.workId == workId)
                .Select(wt => wt.tagId)
                .ToList();
            ViewBag.AuthorName = db.users.FirstOrDefault(u => u.usersId == work.authorId)?.usersName ?? "Unknown";
            ViewBag.Arcs = db.work_Arc.Where(a => a.work_Id == work.workId).ToList();
            ViewBag.Chapters = db.work_Chapter
                .Where(c => c.work_Arc.work_Id == work.workId)
                .ToList();
            return View(work);
        }

        // POST: Admin/EditWork - Handle form submission to update a work
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult EditWork(
            work updatedWork,
            HttpPostedFileBase workImage,
            int[] selectedTags,
            int[] arcIds,
            string[] arcTitles,
            int[] chapterIds,
            string[] chapterTitles)
        {
            try
            {
                if (ModelState.IsValid)
                {
                    // 1. Cập nhật thông tin cơ bản của Work
                    var work = db.works.Include(w => w.work_Tag).FirstOrDefault(w => w.workId == updatedWork.workId);
                    if (work == null)
                    {
                        return Json(new { success = false, message = "Work not found." });
                    }

                    // Kiểm tra trùng tên work (trừ work hiện tại)
                    if (db.works.Any(w => w.workName == updatedWork.workName && w.workId != updatedWork.workId))
                    {
                        return Json(new { success = false, message = "A work with this name already exists." });
                    }

                    work.workName = updatedWork.workName;
                    work.workOverview = updatedWork.workOverview;
                    work.genreId = updatedWork.genreId;
                    work.work_StatusId = updatedWork.work_StatusId;

                    // Cập nhật ảnh cover nếu có
                    if (workImage != null && workImage.ContentLength > 0)
                    {
                        var fileName = Path.GetFileName(workImage.FileName);
                        var path = Path.Combine(Server.MapPath("~/Content/Images/"), fileName);
                        workImage.SaveAs(path);
                        work.workImage = fileName;
                    }

                    // 2. Cập nhật Tags
                    var existingTags = work.work_Tag.ToList();
                    db.work_Tag.RemoveRange(existingTags);

                    if (selectedTags != null && selectedTags.Any())
                    {
                        foreach (var tagId in selectedTags)
                        {
                            db.work_Tag.Add(new work_Tag
                            {
                                workId = work.workId,
                                tagId = tagId
                            });
                        }
                    }

                    // 3. Cập nhật Arcs
                    if (arcIds != null && arcTitles != null && arcIds.Length == arcTitles.Length)
                    {
                        for (int i = 0; i < arcIds.Length; i++)
                        {
                            var arc = db.work_Arc.Find(arcIds[i]);
                            if (arc != null)
                            {
                                arc.work_ArcTitle = arcTitles[i];
                                db.Entry(arc).State = EntityState.Modified;
                            }
                        }
                    }

                    // 4. Cập nhật Chapters
                    if (chapterIds != null && chapterTitles != null && chapterIds.Length == chapterTitles.Length)
                    {
                        for (int i = 0; i < chapterIds.Length; i++)
                        {
                            var chapter = db.work_Chapter.Find(chapterIds[i]);
                            if (chapter != null)
                            {
                                chapter.work_ChapterTitle = chapterTitles[i];
                                db.Entry(chapter).State = EntityState.Modified;
                            }
                        }
                    }

                    db.SaveChanges();

                    return Json(new
                    {
                        success = true,
                        message = "Work updated successfully."
                    });
                }

                // Nếu ModelState không hợp lệ
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return Json(new
                {
                    success = false,
                    message = errors.Any() ? string.Join("; ", errors) : "Invalid input."
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "An error occurred: " + ex.Message
                });
            }
        }

        // GET: Admin/WorkDetails - View details of a specific work
        public ActionResult WorkDetails(int? workId)
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
            var status = db.work_Status.FirstOrDefault(s => s.work_StatusId == work.work_StatusId);
            var tags = db.work_Tag
                .Where(wt => wt.workId == workId)
                .Select(wt => wt.tag.tagName)
                .ToList();
            var author = db.users.FirstOrDefault(u => u.usersId == work.authorId);

            // Retrieve arcs and chapters
            var arcs = db.work_Arc
                .Where(a => a.work_Id == workId)
                .ToList();
            var arcIds = arcs.Select(a => a.work_ArcId).ToList();
            var chapters = arcIds.Any()
                ? db.work_Chapter
                    .Where(c => arcIds.Contains(c.work_ArcId ?? 0))
                    .ToList()
                : new List<work_Chapter>();

            ViewBag.Work = work;
            ViewBag.Genre = genre != null ? genre.genreName : "Unknown";
            ViewBag.Status = status != null ? status.work_StatusName : "Unknown";
            ViewBag.Tags = tags.Any() ? string.Join(", ", tags) : "None";
            ViewBag.Author = author != null ? author.usersName : "Unknown";
            ViewBag.Arcs = arcs; // Pass arcs to the view
            ViewBag.Chapters = chapters; // Pass chapters to the view

            return View();
        }

        // POST: Admin/DeleteWork - Delete a work
        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteWork(int workId)
        {
            try
            {
                var work = db.works.FirstOrDefault(w => w.workId == workId);
                if (work == null)
                {
                    return Json(new { success = false, message = "Work not found." });
                }

                // Lưu tên tác phẩm trước khi xóa
                string workName = work.workName ?? "Tác phẩm không có tên";

                // Xóa các chapter images trước
                var chapters = db.work_Chapter
                                .Where(c => c.work_Arc.work_Id == workId)
                                .ToList();

                foreach (var chapter in chapters)
                {
                    var images = db.work_ChapterImage
                                  .Where(ci => ci.work_ChapterId == chapter.work_ChapterId)
                                  .ToList();
                    db.work_ChapterImage.RemoveRange(images);
                }

                // Xóa các chapters
                db.work_Chapter.RemoveRange(chapters);

                // Xóa các arcs
                var arcs = db.work_Arc.Where(a => a.work_Id == workId).ToList();
                db.work_Arc.RemoveRange(arcs);

                // Xóa các bảng liên quan khác
                db.work_Tag.RemoveRange(db.work_Tag.Where(wt => wt.workId == workId));
                db.work_View.RemoveRange(db.work_View.Where(wv => wv.workId == workId));
                db.work_Heart.RemoveRange(db.work_Heart.Where(wh => wh.workId == workId));
                db.work_Favorite.RemoveRange(db.work_Favorite.Where(wf => wf.workId == workId));
                db.work_Comment.RemoveRange(db.work_Comment.Where(wc => wc.workId == workId));
                db.author_Warning.RemoveRange(db.author_Warning.Where(aw => aw.author_WarningWorkId == workId));
                db.user_History.RemoveRange(db.user_History.Where(uh => uh.workId == workId));

                // Cuối cùng xóa work
                db.works.Remove(work);
                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = "Work deleted successfully.",
                    workName = workName
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error deleting work: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                return Json(new
                {
                    success = false,
                    message = "Error deleting work: " + ex.Message,
                    errorDetails = ex.InnerException?.Message
                });
            }
        }

        [HttpGet]
        public ActionResult EditChapterContent(int chapterId)
        {
            var chapter = db.work_Chapter.FirstOrDefault(c => c.work_ChapterId == chapterId);
            if (chapter == null) return HttpNotFound();

            if (Convert.ToBoolean(chapter.work_ChapterIsImage))
            {
                var images = db.work_ChapterImage
                    .Where(i => i.work_ChapterId == chapterId)
                    .OrderBy(i => i.work_ChapterImageOrder)
                    .ToList();
                ViewBag.Images = images;
            }

            return PartialView("EditChapterContent", chapter);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult ReplaceChapterImage(int imageId, int chapterId, HttpPostedFileBase newImage)
        {
            try
            {
                var image = db.work_ChapterImage.Find(imageId);
                if (image == null) return Json(new { success = false, message = "Image not found" });

                // Xóa ảnh cũ
                System.IO.File.Delete(Path.Combine(Server.MapPath("~/Content/Images/Manga/"), image.work_ChapterImageName));

                // Lưu ảnh mới
                var fileName = Path.GetFileName(newImage.FileName);
                var path = Path.Combine(Server.MapPath("~/Content/Images/Manga/"), fileName);
                newImage.SaveAs(path);

                // Cập nhật database
                image.work_ChapterImageName = fileName;
                db.SaveChanges();

                return Json(new { success = true, message = "Image replaced" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [ValidateInput(false)]
        public ActionResult SaveChapterContent()
        {
            try
            {
                // Kiểm tra và parse dữ liệu
                if (!int.TryParse(Request.Form["chapterId"], out int chapterId))
                    return Json(new { success = false, message = "Invalid chapter ID" });

                var chapter = db.work_Chapter.Find(chapterId);
                if (chapter == null)
                    return Json(new { success = false, message = "Chapter not found" });

                // Cập nhật tiêu đề
                chapter.work_ChapterTitle = Request.Unvalidated["chapterTitle"] ?? chapter.work_ChapterTitle;

                // Xử lý theo loại chapter
                if (!Convert.ToBoolean(chapter.work_ChapterIsImage))
                {
                    // Light Novel
                    chapter.work_ChapterContent = Request.Unvalidated["content"];
                }
                else
                {
                    // Tính thứ tự hiện tại của ảnh trong chương
                    int currentImageCount = db.work_ChapterImage
                        .Where(i => i.work_ChapterId == chapterId)
                        .Count();
                    // Manga - Xử lý upload ảnh
                    // Xử lý ảnh mới (Manga)
                    for (int i = 0; i < Request.Files.Count; i++)
                    {
                        var file = Request.Files[i];
                        if (file != null && file.ContentLength > 0)
                        {
                            var fileName = Path.GetFileName(file.FileName);
                            var path = Path.Combine(Server.MapPath("~/Content/Images/Manga/"), fileName);
                            file.SaveAs(path);

                            db.work_ChapterImage.Add(new work_ChapterImage
                            {
                                work_ChapterId = chapterId,
                                work_ChapterImageName = fileName,
                                work_ChapterImageOrder = currentImageCount + i
                            });
                        }
                    }

                    var orderedIds = Request.Form.GetValues("orderedImageIds");
                    if (orderedIds != null)
                    {
                        for (int i = 0; i < orderedIds.Length; i++)
                        {
                            int id = int.Parse(orderedIds[i]);
                            var image = db.work_ChapterImage.Find(id);
                            if (image != null)
                            {
                                image.work_ChapterImageOrder = i;
                            }
                        }
                    }
                }

                db.SaveChanges();
                return Json(new { success = true, message = "Chapter saved successfully" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteChapterImage(int imageId)
        {
            try
            {
                var image = db.work_ChapterImage.Find(imageId);
                if (image == null) return Json(new { success = false, message = "Image not found" });

                // Xóa file vật lý
                var filePath = Path.Combine(Server.MapPath("~/Content/Images/Manga/"), image.work_ChapterImageName);
                if (System.IO.File.Exists(filePath))
                {
                    System.IO.File.Delete(filePath);
                }

                // Xóa trong database
                db.work_ChapterImage.Remove(image);
                db.SaveChanges();

                return Json(new { success = true, message = "Image deleted" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public ActionResult AddTag(string tagName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(tagName))
                {
                    return Json(new { success = false, message = "Tag name cannot be empty." });
                }

                // Check for duplicate tag name
                if (db.tags.Any(t => t.tagName.ToLower() == tagName.ToLower()))
                {
                    return Json(new { success = false, message = "A tag with this name already exists." });
                }

                var newTag = new tag
                {
                    tagName = tagName.Trim()
                };

                db.tags.Add(newTag);
                db.SaveChanges();

                return Json(new { success = true, message = "Tag added successfully.", tagId = newTag.tagId, tagName = newTag.tagName });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        public ActionResult DeleteTag(int tagId, string password)
        {
            try
            {
                // Verify admin password
                if (password != "123")
                {
                    return Json(new { success = false, message = "Incorrect password." });
                }

                var tagToDelete = db.tags.Find(tagId);
                if (tagToDelete == null)
                {
                    return Json(new { success = false, message = "Tag not found." });
                }

                // Remove all work-tag relationships first
                var workTags = db.work_Tag.Where(wt => wt.tagId == tagId).ToList();
                db.work_Tag.RemoveRange(workTags);

                // Remove the tag
                db.tags.Remove(tagToDelete);
                db.SaveChanges();

                return Json(new { success = true, message = "Tag deleted successfully." });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteMultipleImages(List<int> imageIds)
        {
            try
            {
                if (imageIds == null || !imageIds.Any())
                    return Json(new { success = false, message = "Không có ảnh nào được chọn" });

                foreach (int id in imageIds)
                {
                    var image = db.work_ChapterImage.Find(id);
                    if (image != null)
                    {
                        string path = Server.MapPath("~/Content/Images/Manga/" + image.work_ChapterImageName);
                        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

                        db.work_ChapterImage.Remove(image);
                    }
                }

                db.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult DeleteAllImages(int chapterId)
        {
            try
            {
                var images = db.work_ChapterImage.Where(i => i.work_ChapterId == chapterId).ToList();
                foreach (var img in images)
                {
                    var path = Server.MapPath("~/Content/Images/Manga/" + img.work_ChapterImageName);
                    if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

                    db.work_ChapterImage.Remove(img);
                }

                db.SaveChanges();
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public JsonResult GetChapterImages(int chapterId)
        {
            var images = db.work_ChapterImage
                .Where(i => i.work_ChapterId == chapterId)
                .OrderBy(i => i.work_ChapterImageOrder)
                .Select(i => Url.Content("~/Content/Images/Manga/" + i.work_ChapterImageName))
                .ToList();

            return Json(new { success = true, images = images }, JsonRequestBehavior.AllowGet);
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
