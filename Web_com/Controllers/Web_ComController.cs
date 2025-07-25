using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Web_com.Models.Entities;
using Web_com.Models.ModelView;

namespace Web_com.Controllers
{
    public class Web_ComController : Controller
    {
        private web_comEntities db = new web_comEntities();
        public ActionResult Register(int? id)
        {
            if (Session["UserId"] != null)
            {
                int userId;
                if (int.TryParse(Session["UserId"].ToString(), out userId)) // Xử lý ép kiểu an toàn
                {
                    var user = db.users.FirstOrDefault(u => u.usersId == userId);

                    if (user != null)
                    {
                        ViewBag.UserName = user.usersName;
                        ViewBag.IsLoggedIn = true;
                    }
                }
            }

            var works = db.works
                .Where(w => w.isDisabled == false || w.isDisabled == null) // Xử lý cả trường hợp null
                .OrderBy(w => w.workName)
                .ToList();
            return View(works);
        }

        public ActionResult Login(int? id)
        {
            // Check if user is already logged in
            if (Session["UserId"] != null)
            {
                int userId;
                if (int.TryParse(Session["UserId"].ToString(), out userId)) // Xử lý ép kiểu an toàn
                {
                    var user = db.users.FirstOrDefault(u => u.usersId == userId);

                    if (user != null)
                    {
                        ViewBag.UserName = user.usersName;
                        ViewBag.IsLoggedIn = true;
                    }
                }
            }

            var works = db.works
                .Where(w => w.isDisabled == false || w.isDisabled == null)
                .OrderBy(w => w.workName)
                .ToList();
            return View(works);
        }

        public ActionResult Guest()
        {
            var works = db.works
                .Where(w => w.isDisabled == false || w.isDisabled == null)
                .OrderBy(w => w.workName)
                .ToList();
            return View(works);
        }

        // Action để tìm kiếm theo tên truyện, thể loại, tag và status
        [HttpGet]
        public JsonResult SearchWorks(string searchTerm, int[] genreIds, int[] tagIds, int[] statusIds)
        {
            try
            {
                // Chỉ include những quan hệ thực sự cần thiết
                var query = db.works.Where(w => w.isDisabled == false || w.isDisabled == null);

                // Lọc theo searchTerm (sử dụng Full-Text Search nếu có)
                if (!string.IsNullOrEmpty(searchTerm))
                {
                    query = query.Where(w => w.workName.Contains(searchTerm));
                }

                // Lọc theo genreIds (tối ưu hóa cho trường hợp nhiều genre)
                if (genreIds != null && genreIds.Length > 0)
                {
                    query = query.Where(w => genreIds.Contains(w.genreId ?? 0));
                }

                // Lọc theo tagIds (sử dụng join thay vì Any() để tối ưu)
                if (tagIds != null && tagIds.Length > 0)
                {
                    query = from w in query
                            join wt in db.work_Tag on w.workId equals wt.workId
                            where tagIds.Contains(wt.tagId.Value)
                            select w;

                    query = query.Distinct(); // Tránh trùng lặp
                }

                // Lọc theo statusIds
                if (statusIds != null && statusIds.Length > 0)
                {
                    query = query.Where(w => w.work_StatusId.HasValue &&
                                           statusIds.Contains(w.work_StatusId.Value));
                }

                // Chỉ select những trường cần thiết và join khi cần
                var results = query
                    .OrderBy(w => w.workName)
                    .Take(50)
                    .Select(w => new
                    {
                        w.workId,
                        w.workName,
                        w.workImage,
                        GenreName = w.genre.genreName,
                        StatusName = w.work_Status.work_StatusName,
                        AuthorName = w.user.usersName,
                        Tags = w.work_Tag.Select(wt => wt.tag.tagName)
                    })
                    .ToList();

                return Json(results, JsonRequestBehavior.AllowGet);
            }
            catch (Exception ex)
            {
                // Log lỗi để debug
                Debug.WriteLine("=== SEARCH ERROR ===");
                Debug.WriteLine(ex.Message);
                Debug.WriteLine(ex.StackTrace);
                return Json(new { error = true, message = ex.Message }, JsonRequestBehavior.AllowGet);
            }

        }
        
        // Action để lọc theo thể loại, tên truyện, tag và status
        [HttpGet]
        public JsonResult FilterByGenre(int? genreId, string searchTerm, int[] tagIds, int[] statusIds)
        {
            Debug.WriteLine($"FilterByGenre: tagIds = [{(tagIds != null ? string.Join(", ", tagIds) : "null")}], statusIds = [{(statusIds != null ? string.Join(", ", statusIds) : "null")}]");

            var query = db.works
                .Where(w => w.isDisabled == false || w.isDisabled == null)
                .Include(w => w.work_Tag.Select(wt => wt.tag))
                .Include(w => w.genre)
                .Include(w => w.work_Status)
                .Include(w => w.user);

            if (genreId.HasValue)
            {
                query = query.Where(w => w.genreId == genreId.Value);
            }

            if (!string.IsNullOrEmpty(searchTerm))
            {
                string lower = searchTerm.ToLower();
                query = query.Where(w => w.workName.ToLower().Contains(lower));
            }

            if (tagIds != null && tagIds.Length > 0)
            {
                var tagIdsList = tagIds.ToList();
                query = from w in query
                        join wt in db.work_Tag on w.workId equals wt.workId
                        where tagIdsList.Contains(wt.tagId.Value)
                        group w by w into g
                        select g.Key;

                Debug.WriteLine("Tag filter SQL: " + query.ToString());

                query = query
                    .OrderByDescending(w => w.work_Tag.Count(wt => tagIdsList.Contains(wt.work_TagId)))
                    .ThenBy(w => tagIdsList.Select((tagId, index) => new { tagId, index })
                        .Where(t => w.work_Tag.Any(wt => wt.tagId == t.tagId))
                        .Select(t => t.index)
                        .DefaultIfEmpty(int.MaxValue)
                        .Min());
            }

            if (statusIds != null && statusIds.Length > 0)
            {
                query = query.Where(w => w.work_StatusId.HasValue && statusIds.Contains(w.work_StatusId.Value));
            }

            var works = query.Select(w => new
            {
                w.workId,
                w.workName,
                w.workImage,
                GenreName = w.genre != null ? w.genre.genreName : "Unknown",
                StatusName = w.work_Status != null ? w.work_Status.work_StatusName : "Unknown",
                AuthorName = w.user != null ? w.user.usersName : "Unknown",
                Tags = w.work_Tag.Select(wt => wt.tag.tagName)
            }).ToList();

            Debug.WriteLine($"FilterByGenre: Returned {works.Count} works");
            return Json(works, JsonRequestBehavior.AllowGet);
        }

        // Action để lấy top 3 
        [HttpGet]
        public JsonResult GetRecommendWorks()
        {
            var recommendedIds = new List<int> { 1, 4, 7 };

            var works = db.works
                .Where(w => recommendedIds.Contains(w.workId) && (w.isDisabled == false || w.isDisabled == null))
                .Select(w => new {
                    w.workId,
                    w.workName,
                    w.workImage,
                    GenreName = w.genre.genreName,
                    StatusName = w.work_Status.work_StatusName,
                    AuthorName = w.user.usersName,
                    Tags = w.work_Tag.Select(wt => wt.tag.tagName)
                })
                .ToList();

            return Json(works, JsonRequestBehavior.AllowGet);
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