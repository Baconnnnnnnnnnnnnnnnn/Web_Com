using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Web_com.Models.Entities;
using Web_com.Models.ModelView;

namespace Web_com.Controllers
{
    public class ProfileController : Controller
    {
        private web_comEntities db = new web_comEntities();
        public ActionResult Index(int? id)
        {
            // Nếu query có guest=true thì xem như Guest luôn
            bool isGuestFlag = (Request.QueryString["guest"] == "true");

            // Nếu là guest thì ép currentUserId = null
            int? currentUserId = isGuestFlag ? null :
                                 (Session["UserId"] != null ? (int)Session["UserId"] : (int?)null);

            // Xử lý id
            if (id == null)
            {
                if (currentUserId != null)
                {
                    id = currentUserId;
                }
                else
                {
                    return RedirectToAction("Login", "Web_Com");
                }
            }

            var user = db.users
                .Include(u => u.works)
                .Include(u => u.author_Follow)
                .FirstOrDefault(u => u.usersId == id);

            if (user == null)
            {
                return HttpNotFound("Tác giả không tồn tại");
            }

            // Thiết lập ViewBag
            ViewBag.FollowingCount = db.author_Follow.Count(f => f.followerId == id);
            ViewBag.IsFromGuest = isGuestFlag || (Request.UrlReferrer?.AbsoluteUri.Contains("ArcGuest") ?? false);
            ViewBag.IsGuest = ViewBag.IsFromGuest || (currentUserId == null);
            ViewBag.IsOwner = (currentUserId == id);

            // Kiểm tra follow
            if (currentUserId != null && currentUserId != id)
            {
                ViewBag.IsFollowing = db.author_Follow
                    .Any(f => f.followerId == currentUserId && f.authorId == id);
            }

            return View(user);
        }

        [HttpGet]
        public JsonResult GetUserDetails()
        {
            if (Session["UserId"] == null)
            {
                return Json(new { success = false, message = "User not logged in" }, JsonRequestBehavior.AllowGet);
            }

            try
            {
                int userId = (int)Session["UserId"];
                var user = db.users
                    .Where(u => u.usersId == userId)
                    .Select(u => new {
                        u.usersName,
                        u.usersEmail,
                        u.usersPass // Đổi từ usersPassword thành usersPass
                    })
                    .FirstOrDefault();

                if (user == null)
                {
                    return Json(new { success = false, message = "User not found" }, JsonRequestBehavior.AllowGet);
                }

                return Json(new { success = true, data = user }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpPost]
        public JsonResult UpdateUserDetails(UserUpdateViewModel model)
        {
            try
            {
                if (Session["UserId"] == null)
                    return Json(new { success = false, message = "User not logged in" });

                int userId = (int)Session["UserId"];
                var user = db.users.FirstOrDefault(u => u.usersId == userId);

                if (user == null)
                    return Json(new { success = false, message = "User not found" });

                // Cập nhật tên và email (luôn cập nhật nếu có giá trị)
                if (model.Name != null) // Có thể thêm kiểm tra string.IsNullOrEmpty nếu bạn không muốn cập nhật thành rỗng
                {
                    user.usersName = model.Name;
                }
                if (model.Email != null) // Có thể thêm kiểm tra string.IsNullOrEmpty nếu bạn không muốn cập nhật thành rỗng
                {
                    user.usersEmail = model.Email;
                }

                // QUAN TRỌNG: Chỉ cập nhật mật khẩu nếu có một mật khẩu MỚI được cung cấp
                // Mật khẩu sẽ là null nếu người dùng không tương tác với trường mật khẩu
                if (!string.IsNullOrEmpty(model.Password))
                {
                    // Chỉ cập nhật nếu mật khẩu không null và không rỗng
                    user.usersPass = model.Password;
                }

                db.Entry(user).State = EntityState.Modified;
                db.SaveChanges();

                return Json(new { success = true, message = "Profile updated successfully!", name = user.usersName });
            }
            catch (Exception ex)
            {
                // Log lỗi để debug
                System.Diagnostics.Debug.WriteLine($"Error updating user details: {ex.Message}");
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult FollowAuthor(int authorId)
        {
            if (Session["UserId"] == null)
            {
                return Json(new { success = false, message = "Please login to follow authors" });
            }

            try
            {
                int followerId = (int)Session["UserId"];

                // Check if already following
                var existingFollow = db.author_Follow
                    .FirstOrDefault(f => f.followerId == followerId && f.authorId == authorId);

                bool isFollowing;
                string message;

                if (existingFollow == null)
                {
                    // Add new follow
                    var newFollow = new author_Follow
                    {
                        followerId = followerId,
                        authorId = authorId
                    };
                    db.author_Follow.Add(newFollow);
                    isFollowing = true;
                    message = "You are now following this author!";
                }
                else
                {
                    // Remove follow
                    db.author_Follow.Remove(existingFollow);
                    isFollowing = false;
                    message = "You have unfollowed this author.";
                }

                db.SaveChanges();

                // Get new follower count
                int newFollowerCount = db.author_Follow.Count(f => f.authorId == authorId);

                return Json(new
                {
                    success = true,
                    isFollowing,
                    message,
                    newFollowerCount
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        public JsonResult UploadProfileImage()
        {
            try
            {
                if (Session["UserId"] == null)
                    return Json(new { success = false, message = "User not logged in" });

                var file = Request.Files["file"];
                string type = Request.Form["type"];

                if (file == null || file.ContentLength == 0)
                    return Json(new { success = false, message = "No file uploaded" });

                int userId = (int)Session["UserId"];
                var user = db.users.FirstOrDefault(u => u.usersId == userId);

                if (user == null)
                    return Json(new { success = false, message = "User not found" });

                // Generate unique filename
                string extension = Path.GetExtension(file.FileName);
                string fileName = $"{userId}_{DateTime.Now:yyyyMMddHHmmss}{extension}";
                string folder = type == "avatar" ? "Avatar" : "Cover";
                string path = Path.Combine(Server.MapPath($"~/Content/Images/{folder}"), fileName);

                // Save file
                file.SaveAs(path);

                // Update database
                if (type == "avatar")
                    user.usersAvatar = fileName;
                else
                    user.usersCover = fileName;

                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    filePath = Url.Content($"~/Content/Images/{folder}/{fileName}")
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message });
            }
        }

        [HttpGet]
        public JsonResult GetUserPassword()
        {
            try
            {
                if (Session["UserId"] == null)
                    return Json(new { success = false, message = "User not logged in" }, JsonRequestBehavior.AllowGet);

                int userId = (int)Session["UserId"];
                var user = db.users.FirstOrDefault(u => u.usersId == userId);

                if (user == null)
                    return Json(new { success = false, message = "User not found" }, JsonRequestBehavior.AllowGet);

                // Return password inside a 'data' object for consistency and robustness
                return Json(new { success = true, data = new { password = user.usersPass } }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                // Log the exception for debugging on the server
                System.Diagnostics.Debug.WriteLine($"Error in GetUserPassword: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                return Json(new { success = false, message = "An error occurred while retrieving password." }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public ActionResult AddWork()
        {
            if (Session["UserId"] == null)
            {
                return RedirectToAction("Login", "Web_Com");
            }

            int userId = (int)Session["UserId"];
            var user = db.users.FirstOrDefault(u => u.usersId == userId);

            if (user == null)
            {
                return RedirectToAction("Login", "Web_Com");
            }

            ViewBag.Genres = db.genres.ToList();
            ViewBag.Tags = db.tags.ToList();

            var model = new work
            {
                authorId = userId,
                work_StatusId = 1 // Mặc định là Upcoming
            };

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult AddWork(work newWork, HttpPostedFileBase workImage, int[] selectedTags, string authorName)
        {
            try
            {
                // Kiểm tra đăng nhập
                if (Session["UserId"] == null)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                int userId = (int)Session["UserId"];
                var user = db.users.FirstOrDefault(u => u.usersId == userId);
                if (user == null)
                {
                    return Json(new { success = false, message = "User not found" });
                }

                // Xác thực input
                var errors = new List<string>();

                if (string.IsNullOrEmpty(newWork.workName))
                    errors.Add("Work name is required");

                if (string.IsNullOrEmpty(newWork.workOverview))
                    errors.Add("Work overview is required");

                if (newWork.genreId == 0)
                    errors.Add("Please select a genre");

                if (workImage == null || workImage.ContentLength == 0)
                    errors.Add("A cover image is required");

                if (selectedTags == null || !selectedTags.Any())
                    errors.Add("At least one tag must be selected");

                // Kiểm tra trùng tên (case-insensitive và bỏ qua khoảng trắng đầu/cuối)
                if (db.works.Any(w => w.workName.Trim().ToLower() == newWork.workName.Trim().ToLower()))
                    errors.Add("This work name already exists");

                // Nếu có lỗi, trả về ngay
                if (errors.Any())
                {
                    return Json(new
                    {
                        success = false,
                        message = "Validation failed",
                        errors = errors
                    });
                }

                // Xử lý khi hợp lệ
                newWork.authorId = userId;
                newWork.work_StatusId = 1; // Luôn là Upcoming khi mới tạo

                if (!user.isAuthor.GetValueOrDefault())
                {
                    user.isAuthor = true;
                    db.Entry(user).State = EntityState.Modified;
                }

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

                return Json(new
                {
                    success = true,
                    message = "The work has been added successfully!",
                    authorId = userId,
                    redirectUrl = Url.Action("AddContent", "Profile", new { id = newWork.workId })
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "An error occurred while adding the work",
                    error = ex.Message
                });
            }
        }

        private ActionResult Respond(bool success, string message, work model = null)
        {
            // Đảm bảo các ViewBag luôn được thiết lập
            ViewBag.Genres = db.genres.ToList();
            ViewBag.Statuses = db.work_Status.ToList();
            ViewBag.Tags = db.tags.ToList();

            if (Request.IsAjaxRequest())
            {
                return Json(new { success, message });
            }

            if (success)
            {
                return RedirectToAction("Index", "Profile", new { id = Session["UserId"] });
            }

            return View("AddWork", model);
        }

        public ActionResult AddContent(int id)
        {
            if (Session["UserId"] == null)
            {
                return RedirectToAction("Login", "Web_Com");
            }

            var work = db.works
                .Include(w => w.genre)
                .Include(w => w.work_Status)
                .Include(w => w.work_Tag.Select(wt => wt.tag))
                .Include(w => w.work_Arc)
                .Include(w => w.work_Arc.Select(a => a.work_Chapter))
                .FirstOrDefault(w => w.workId == id);

            if (work == null)
            {
                return HttpNotFound();
            }

            // Check if current user is the author
            int userId = (int)Session["UserId"];
            if (work.authorId != userId)
            {
                return RedirectToAction("Index", "Profile", new { id = userId });
            }

            return View(work);
        }

        [HttpPost]
        public JsonResult AddArc(int workId, string title)
        {
            try
            {
                // Kiểm tra trùng tên Arc trong cùng work
                if (db.work_Arc.Any(a => a.work_Id == workId && a.work_ArcTitle == title))
                {
                    return Json(new
                    {
                        success = false,
                        message = "Arc name already exists in this work"
                    });
                }

                // Tự động tính order (max order hiện tại + 1)
                int maxOrder = db.work_Arc
                    .Where(a => a.work_Id == workId)
                    .Max(a => (int?)a.work_ArcOrder) ?? 0;

                var newArc = new work_Arc
                {
                    work_ArcTitle = title,
                    work_ArcOrder = maxOrder + 1, // Tự động tăng order
                    work_Id = workId
                };

                db.work_Arc.Add(newArc);
                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = "Arc added successfully",
                    arcId = newArc.work_ArcId,
                    order = newArc.work_ArcOrder
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Error adding arc",
                    error = ex.Message
                });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [ValidateInput(false)]
        public ActionResult AddChapter(int arcId, string title, int order, bool isImage, string content = null, HttpPostedFileBase[] images = null)
        {
            try
            {
                var arc = db.work_Arc.Include(a => a.work.genre).FirstOrDefault(a => a.work_ArcId == arcId);
                if (arc == null)
                    return Json(new { success = false, message = "Arc not found" });

                bool isManga = arc.work.genre.genreName == "Manga";

                // Kiểm tra trùng tên
                if (db.work_Chapter.Any(c => c.work_ArcId == arcId && c.work_ChapterTitle == title))
                {
                    return Json(new { success = false, message = "Chapter name already exists in this arc" });
                }

                int maxOrder = db.work_Chapter
                    .Where(c => c.work_ArcId == arcId)
                    .Max(c => (int?)c.work_ChapterOrder) ?? 0;

                var newChapter = new work_Chapter
                {
                    work_ChapterTitle = title,
                    work_ChapterOrder = maxOrder + 1,
                    work_ArcId = arcId,
                    work_ChapterIsImage = isManga,
                    work_ChapterContent = isManga ? null : content
                };

                db.work_Chapter.Add(newChapter);
                db.SaveChanges(); // Lưu để có được chapterId

                if (isManga)
                {
                    var files = Request.Files;
                    if (files.Count == 0)
                    {
                        return Json(new { success = false, message = "Please upload at least one image" });
                    }

                    List<string> savedFiles = new List<string>();
                    for (int i = 0; i < files.Count; i++)
                    {
                        var file = files[i];
                        if (file.ContentLength > 0)
                        {
                            string fileName = $"{newChapter.work_ChapterId}_{i}_{DateTime.Now:yyyyMMddHHmmss}{Path.GetExtension(file.FileName)}";
                            string path = Path.Combine(Server.MapPath("~/Content/Images/Manga"), fileName);
                            file.SaveAs(path);

                            var chapterImage = new work_ChapterImage
                            {
                                work_ChapterImageName = fileName,
                                work_ChapterImageOrder = i + 1,
                                work_ChapterId = newChapter.work_ChapterId
                            };

                            db.work_ChapterImage.Add(chapterImage);
                            savedFiles.Add(fileName);
                        }
                    }

                    db.SaveChanges();
                }

                return Json(new
                {
                    success = true,
                    message = "Chapter added successfully",
                    chapterId = newChapter.work_ChapterId,
                    order = newChapter.work_ChapterOrder
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Error adding chapter",
                    error = ex.Message
                });
            }
        }


        [HttpPost]
        public JsonResult AddChapterImages(int chapterId)
        {
            try
            {
                if (Session["UserId"] == null)
                {
                    return Json(new { success = false, message = "User not logged in" });
                }

                var chapter = db.work_Chapter
                    .Include(c => c.work_Arc)
                    .Include(c => c.work_Arc.work)
                    .FirstOrDefault(c => c.work_ChapterId == chapterId);

                if (chapter == null)
                {
                    return Json(new { success = false, message = "Chapter not found" });
                }

                // Check if current user is the author
                int userId = (int)Session["UserId"];
                if (chapter.work_Arc.work.authorId != userId)
                {
                    return Json(new { success = false, message = "Unauthorized access" });
                }

                var files = Request.Files;
                if (files.Count == 0)
                {
                    return Json(new { success = false, message = "No images uploaded" });
                }

                List<string> savedFiles = new List<string>();
                for (int i = 0; i < files.Count; i++)
                {
                    var file = files[i];
                    if (file.ContentLength > 0)
                    {
                        string fileName = $"{chapterId}_{i}_{DateTime.Now:yyyyMMddHHmmss}{Path.GetExtension(file.FileName)}";
                        string path = Path.Combine(Server.MapPath("~/Content/Images/Manga"), fileName);
                        file.SaveAs(path);

                        var chapterImage = new work_ChapterImage
                        {
                            work_ChapterImageName = fileName,
                            work_ChapterImageOrder = i + 1,
                            work_ChapterId = chapterId
                        };

                        db.work_ChapterImage.Add(chapterImage);
                        savedFiles.Add(fileName);
                    }
                }

                db.SaveChanges();

                return Json(new
                {
                    success = true,
                    message = "Images uploaded successfully",
                    files = savedFiles
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = "Error uploading images",
                    error = ex.Message
                });
            }
        }

        [HttpGet]
        public JsonResult GetFavoritedWorks(int id)
        {
            try
            {
                var favoritedWorks = db.work_Favorite
                    .Where(f => f.userId == id)
                    .Select(f => new {
                        id = f.work.workId,
                        name = f.work.workName,
                        image = f.work.workImage,
                        genre = f.work.genre.genreName,
                        status = f.work.work_Status.work_StatusName,
                        hearts = f.work.work_Heart.Count,
                        views = f.work.work_View.Count,
                        arcs = f.work.work_Arc.Count,
                        chapters = f.work.work_Arc.Sum(a => a.work_Chapter.Count)
                    })
                    .ToList();

                return Json(new { success = true, data = favoritedWorks }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult GetFollowers(int id)
        {
            try
            {
                var followers = db.author_Follow
                    .Where(f => f.authorId == id)
                    .Select(f => new {
                        id = f.followerId,
                        name = f.user1.usersName,
                        avatar = f.user1.usersAvatar
                    })
                    .ToList();

                return Json(new { success = true, data = followers }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

        [HttpGet]
        public JsonResult GetFollowing(int id)
        {
            try
            {
                var following = db.author_Follow
                    .Where(f => f.followerId == id)
                    .Select(f => new {
                        id = f.authorId,
                        name = f.user.usersName,
                        avatar = f.user.usersAvatar
                    })
                    .ToList();

                return Json(new { success = true, data = following }, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }
        }

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
                        message = "Work updated successfully.",
                        authorId = work.authorId // Thêm authorId vào phản hồi
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